import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, formatDate, unwrapResult } from '../lib/endpoints.js';
import { setTokenAndUser } from '../store/authSlice';

export default function Profile() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { token, user } = useSelector((s) => s.auth);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyStatus, setHistoryStatus] = useState('idle');
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);

  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [profileS3Key, setProfileS3Key] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const profileUserId = id || user?.userId;

  function getPostId(p) {
    const pid = p?._id ?? p?.id ?? p?.postId;
    return pid == null ? '' : String(pid);
  }

  function getDraftEditLink(p) {
    const pid = getPostId(p);
    return pid ? `/posts/create?draftId=${encodeURIComponent(pid)}` : null;
  }

  function getPostViewLink(p) {
    const pid = getPostId(p);
    return pid ? `/posts/${pid}` : null;
  }

  function applyHistoryPayload(payload, fallbackPage = 1, fallbackPageSize = 10) {
    if (Array.isArray(payload)) {
      setHistory(payload);
      setHistoryPage(fallbackPage);
      setHistoryPageSize(fallbackPageSize);
      setHistoryTotal(payload.length);
      setHistoryTotalPages(payload.length ? 1 : 0);
      return;
    }

    const items = payload?.items || [];
    const nextPage = payload?.page ?? fallbackPage;
    const nextPageSize = payload?.pageSize ?? fallbackPageSize;
    const nextTotal = payload?.total ?? items.length;
    const nextTotalPages =
      payload?.totalPages ?? (nextTotal ? Math.ceil(nextTotal / nextPageSize) : 0);

    setHistory(items);
    setHistoryPage(nextPage);
    setHistoryPageSize(nextPageSize);
    setHistoryTotal(nextTotal);
    setHistoryTotalPages(nextTotalPages);
  }

  async function loadHistoryPage(page = 1, keyword = historyKeyword, date = historyDate) {
    setHistoryStatus('loading');
    setHistoryError('');

    try {
      const raw = await apiRequest(
        'GET',
        endpoints.listHistory(keyword, date, page, historyPageSize),
        token
      );
      const list = unwrapResult(raw);
      applyHistoryPayload(list, page, historyPageSize);
      setHistoryStatus('succeeded');
    } catch (e) {
      setHistoryStatus('failed');
      setHistoryError(e?.message || 'Failed to load history');
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadAll() {
      setStatus('loading');
      setError('');

      try {
        const [profileRaw, topRaw, draftRaw, historyRaw] = await Promise.all([
          apiRequest('GET', endpoints.userProfile(profileUserId), token),
          apiRequest('GET', endpoints.top3MyPosts(), token).catch(() => null),
          apiRequest('GET', endpoints.myDraftPosts(), token).catch(() => null),
          apiRequest(
            'GET',
            endpoints.listHistory(historyKeyword, historyDate, 1, historyPageSize),
            token
          ).catch(() => null),
        ]);

        if (ignore) return;

        const profileData = unwrapResult(profileRaw);
        setProfile(profileData);
        setEditFirstName(profileData?.firstName || '');
        setEditLastName(profileData?.lastName || '');
        setEditEmail(profileData?.email || '');
        setProfileS3Key(profileData?.profileS3Key || null);

        if (topRaw) {
          const list = unwrapResult(topRaw);
          setTopPosts(Array.isArray(list) ? list : list?.items || []);
        }

        if (draftRaw) {
          const list = unwrapResult(draftRaw);
          setDrafts(Array.isArray(list) ? list : list?.items || []);
        }

        if (historyRaw) {
          const list = unwrapResult(historyRaw);
          applyHistoryPayload(list, 1, historyPageSize);
          setHistoryStatus('succeeded');
        }

        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setStatus('failed');
        setError(e?.message || 'Failed to load profile');
      }
    }

    if (profileUserId) loadAll();
    return () => {
      ignore = true;
    };
  }, [profileUserId, token]);

  useEffect(() => {
    let ignore = false;

    async function loadPreview() {
      if (!profileS3Key) {
        setPreviewUrl('');
        return;
      }

      try {
        const res = await fetch(
          `http://localhost:5005/files/url?key=${encodeURIComponent(profileS3Key)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!ignore && res.ok && data?.url) {
          setPreviewUrl(data.url);
        }
      } catch {
        if (!ignore) setPreviewUrl('');
      }
    }

    loadPreview();
    return () => {
      ignore = true;
    };
  }, [profileS3Key, token]);

  async function uploadAvatarToS3() {
    if (!imageFile) return;

    setUploading(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', imageFile);
      fd.append('scope', 'users');
      fd.append('kind', 'avatar');

      const res = await fetch('http://localhost:5005/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Upload failed');

      const key = data?.key || data?.result?.key;
      if (!key) throw new Error('Upload ok but no key returned');

      setProfileS3Key(String(key));
      setPreviewUrl(data?.url || '');
      setImageFile(null);
    } catch (e) {
      setError(e?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }

  const onSave = async (e) => {
    e.preventDefault();
    setSaveStatus('loading');
    setSaveMessage('');

    try {
      const payload = {};

      if (editFirstName.trim() !== (profile?.firstName || '')) {
        payload.firstName = editFirstName.trim();
      }
      if (editLastName.trim() !== (profile?.lastName || '')) {
        payload.lastName = editLastName.trim();
      }
      if (editEmail.trim() !== (profile?.email || '')) {
        payload.email = editEmail.trim();
      }
      if (profileS3Key !== profile?.profileS3Key) {
        payload.profileS3Key = profileS3Key;
      }

      if (Object.keys(payload).length === 0) {
        setSaveStatus('idle');
        setSaveMessage('No changes to save.');
        return;
      }

      const raw = await apiRequest(
        'PATCH',
        endpoints.updateUserProfile(profileUserId),
        token,
        payload
      );

      const data = unwrapResult(raw);

      // 🔑 handle rotated JWT (email change)
      const newToken = data?.token ?? data?.result?.token;
      if (newToken) {
        dispatch(setTokenAndUser(newToken));
      }

      setProfile((prev) => ({ ...(prev || {}), ...data }));

      setSaveStatus('succeeded');
      setSaveMessage(
        payload.email
          ? 'Profile updated. Please verify your new email.'
          : 'Profile updated.'
      );
    } catch (e) {
      setSaveStatus('failed');
      setSaveMessage(e?.message || 'Failed to update profile');
    }
  };

  const onSearchHistory = async (e) => {
    e.preventDefault();
    setHistoryPage(1);
    await loadHistoryPage(1, historyKeyword, historyDate);
  };

  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        const statusText = String(item?.status || '').toLowerCase();
        if (statusText) return statusText === 'published';
        if (item?.published !== undefined) return item.published === true;
        return true;
      })
      .sort((a, b) => {
        const aDate = new Date(a?.viewDate || a?.viewedAt || 0).getTime();
        const bDate = new Date(b?.viewDate || b?.viewedAt || 0).getTime();
        return bDate - aDate;
      });
  }, [history]);

  const fullName =
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Unnamed';

  return (
    <PageShell title={`/users/${profileUserId}/profile`} subtitle={null}>
      {status === 'loading' && <div className="muted">Loading…</div>}
      {status === 'failed' && <div className="error">Error: {error}</div>}

      {status === 'succeeded' && (
        <div className="stack">
          {/* header */}
          <div className="card">
            <div className="row">
              {previewUrl && (
                <img className="avatar" src={previewUrl} alt="profile" />
              )}
              <div>
                <div className="title">{fullName}</div>
                <div className="meta">
                  Registered:{' '}
                  {formatDate(profile?.registeredAt || profile?.createdAt)}
                </div>
                <div className="meta">Email: {profile?.email || '—'}</div>
              </div>
            </div>
          </div>

          {/* edit profile */}
          <div className="card">
            <div className="title">Edit Profile</div>
            <form className="form" onSubmit={onSave}>
              <label className="field">
                <span>First Name</span>
                <input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Last Name</span>
                <input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Profile Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  disabled={uploading}
                />
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={uploadAvatarToS3}
                  disabled={!imageFile || uploading}
                >
                  {uploading ? 'Uploading…' : 'Upload Avatar'}
                </button>
              </label>

              {saveMessage && (
                <div className={saveStatus === 'failed' ? 'error' : 'ok'}>
                  {saveMessage}
                </div>
              )}

              <div className="row">
                <button
                  className="btn"
                  type="submit"
                  disabled={saveStatus === 'loading'}
                >
                  {saveStatus === 'loading' ? 'Saving…' : 'Save Changes'}
                </button>
                <div className="hint">
                  Updating email triggers verification. Go to{' '}
                  <Link to="/users/verify">/users/verify</Link>.
                </div>
              </div>
            </form>
          </div>

          {/* history */}
          <div className="card">
            <div className="title">View History (Published)</div>
            <form className="row" onSubmit={onSearchHistory}>
              <input
                className="input"
                value={historyKeyword}
                onChange={(e) => setHistoryKeyword(e.target.value)}
                placeholder="Search history keyword"
              />
              <input
                className="input"
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
              />
              <button className="btn" type="submit">
                Search
              </button>
            </form>

            {historyStatus === 'failed' && (
              <div className="error">{historyError}</div>
            )}

            {filteredHistory.length === 0 ? (
              <div className="muted">No history yet.</div>
            ) : (
              <>
                <div className="list">
                  {filteredHistory.map((item) => (
                    <div
                      key={item.historyId || `${item.postId}-${item.viewDate}`}
                      className="listItem"
                    >
                      <div className="listItem__top">
                        <Link className="link" to={`/posts/${item.postId}`}>
                          <b>{item?.post?.title || `Post ${item.postId}`}</b>
                        </Link>
                        <span className="pill">Viewed</span>
                      </div>
                      <div className="muted">
                        {formatDate(item.viewDate || item.viewedAt)}
                      </div>
                    </div>
                  ))}
                </div>
                {historyTotal > 0 && (
                  <div className="row">
                    <button
                      className="btn btn--ghost"
                      type="button"
                      disabled={historyPage <= 1 || historyStatus === 'loading'}
                      onClick={() => loadHistoryPage(historyPage - 1)}
                    >
                      Previous
                    </button>
                    <div className="muted">
                      Page {historyPage} of {historyTotalPages || 1} • {historyTotal}{' '}
                      total
                    </div>
                    <button
                      className="btn btn--ghost"
                      type="button"
                      disabled={
                        historyStatus === 'loading' ||
                        historyTotalPages === 0 ||
                        historyPage >= historyTotalPages
                      }
                      onClick={() => loadHistoryPage(historyPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* top 3 posts (added at end) */}
          <div className="card">
            <div className="title">Top 3 My Posts</div>

            {topPosts.length === 0 ? (
              <div className="muted">No posts found.</div>
            ) : (
              <div className="list">
                {topPosts.map((p) => {
                  const to = getPostViewLink(p);
                  const pid = getPostId(p);
                  return (
                    <div key={pid || Math.random()} className="listItem">
                      <div className="listItem__top">
                        {to ? (
                          <Link className="link" to={to}>
                            <b>{p?.title || `Post ${pid}`}</b>
                          </Link>
                        ) : (
                          <b>{p?.title || `Post ${pid}`}</b>
                        )}
                      </div>
                      <div className="muted">
                        {formatDate(p?.createdAt || p?.updatedAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* drafts (added at end) */}
          <div className="card">
            <div className="title">My Drafts</div>

            {drafts.length === 0 ? (
              <div className="muted">No drafts.</div>
            ) : (
              <div className="list">
                {drafts.map((p) => {
                  const pid = getPostId(p);
                  const editTo = getDraftEditLink(p);
                  return (
                    <div key={pid || Math.random()} className="listItem">
                      <div className="listItem__top">
                        <b>{p?.title || `Draft ${pid}`}</b>
                        {editTo && (
                          <Link className="link" to={editTo}>
                            Edit
                          </Link>
                        )}
                      </div>
                      <div className="muted">
                        Last updated: {formatDate(p?.updatedAt || p?.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}
