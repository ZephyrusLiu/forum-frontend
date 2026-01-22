import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, formatDate, unwrapResult } from '../lib/endpoints.js';

export default function Profile() {
  const { id } = useParams();
  const { token, user } = useSelector((s) => s.auth);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const [profile, setProfile] = useState(null);
  const [topPosts, setTopPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [history, setHistory] = useState([]);

  const [editImage, setEditImage] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const profileUserId = id || user?.userId;

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const [profileRaw, topRaw, draftRaw, historyRaw] = await Promise.all([
          apiRequest('GET', endpoints.userProfile(profileUserId), token),
          apiRequest('GET', endpoints.top3MyPosts(), token),
          apiRequest('GET', endpoints.myDraftPosts(), token),
          apiRequest('GET', endpoints.listHistory(), token),
        ]);

        if (ignore) return;

        const profileData = unwrapResult(profileRaw);
        setProfile(profileData);
        setEditImage(profileData?.profileImageUrl || profileData?.profileImageURL || '');
        setEditEmail(profileData?.email || '');

        const topList = unwrapResult(topRaw);
        setTopPosts(Array.isArray(topList) ? topList : topList?.items || []);

        const draftList = unwrapResult(draftRaw);
        setDrafts(Array.isArray(draftList) ? draftList : draftList?.items || []);

        const historyList = unwrapResult(historyRaw);
        setHistory(Array.isArray(historyList) ? historyList : historyList?.items || []);

        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load profile');
        setStatus('failed');
      }
    }

    if (profileUserId) {
      run();
    }

    return () => {
      ignore = true;
    };
  }, [profileUserId, token]);

  const filteredHistory = useMemo(() => {
    return history
      .filter((item) => {
        const statusText = String(item?.status || item?.postStatus || '').toLowerCase();
        if (statusText) return statusText === 'published';
        if (item?.published !== undefined) return item.published === true;
        if (item?.isPublished !== undefined) return item.isPublished === true;
        return true;
      })
      .sort((a, b) => {
        const aDate = new Date(a?.viewDate || a?.viewedAt || 0).getTime();
        const bDate = new Date(b?.viewDate || b?.viewedAt || 0).getTime();
        return bDate - aDate;
      });
  }, [history]);

  const onSave = async (e) => {
    e.preventDefault();
    setSaveStatus('loading');
    setSaveMessage('');

    try {
      const payload = {
        profileImageUrl: editImage.trim(),
        email: editEmail.trim(),
      };
      const raw = await apiRequest('PUT', endpoints.updateUserProfile(profileUserId), token, payload);
      const data = unwrapResult(raw);

      setProfile((prev) => ({ ...(prev || {}), ...payload, ...(data || {}) }));
      setSaveStatus('succeeded');
      setSaveMessage(
        editEmail.trim() && editEmail.trim() !== (profile?.email || '')
          ? 'Profile updated. Please verify your new email.'
          : 'Profile updated.',
      );
    } catch (e) {
      setSaveStatus('failed');
      setSaveMessage(e?.message || 'Failed to update profile');
    }
  };

  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'Unnamed';
  const profileImage =
    profile?.profileImageUrl || profile?.profileImageURL || profile?.avatarUrl || profile?.avatar;
  return (
    <PageShell title={`/users/${profileUserId}/profile`} subtitle={null}>
      {status === 'loading' ? <div className="muted">Loading…</div> : null}
      {status === 'failed' ? <div className="error">Error: {error}</div> : null}

      {status === 'succeeded' ? (
        <div className="stack">
          <div className="card">
            <div className="row">
              {profileImage ? <img className="avatar" src={profileImage} alt="profile" /> : null}
              <div>
                <div className="title" style={{ marginTop: 0 }}>
                  {fullName}
                </div>
                <div className="meta">Registered: {formatDate(profile?.registeredAt || profile?.createdAt)}</div>
                <div className="meta">Email: {profile?.email || '—'}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="title" style={{ marginTop: 0 }}>
              Edit Profile
            </div>
            <form className="form" onSubmit={onSave}>
              <label className="field">
                <span>Profile Image URL (S3)</span>
                <input value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="https://..." />
              </label>
              <label className="field">
                <span>Email</span>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="you@example.com" />
              </label>
              {saveMessage ? (
                <div className={saveStatus === 'failed' ? 'error' : 'ok'}>{saveMessage}</div>
              ) : null}
              <div className="row">
                <button className="btn" type="submit" disabled={saveStatus === 'loading'}>
                  {saveStatus === 'loading' ? 'Saving…' : 'Save Changes'}
                </button>
                <div className="hint">
                  Updating email triggers verification. Go to <Link to="/users/verify">/users/verify</Link>.
                </div>
              </div>
            </form>
          </div>

          <div className="grid2">
            <div className="card">
              <div className="title" style={{ marginTop: 0 }}>
                Top 3 Posts (by replies)
              </div>
              {topPosts.length === 0 ? (
                <div className="muted">No posts yet.</div>
              ) : (
                <div className="list">
                  {topPosts.map((post) => (
                    <div key={post.id || post.postId} className="listItem">
                      <div className="listItem__top">
                        <Link className="link" to={`/posts/${post.id || post.postId}`}>
                          <b>{post.title || '(Untitled)'}</b>
                        </Link>
                        <span className="pill">{post.replyCount ?? post.repliesCount ?? post.replies?.length ?? 0} replies</span>
                      </div>
                      <div className="muted">
                        {formatDate(post.dateCreated || post.createdAt || post.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <div className="title" style={{ marginTop: 0 }}>
                Drafts
              </div>
              {drafts.length === 0 ? (
                <div className="muted">No drafts.</div>
              ) : (
                <div className="list">
                  {drafts.map((post) => (
                    <div key={post.id || post.postId} className="listItem">
                      <div className="listItem__top">
                        <Link className="link" to={`/posts/${post.id || post.postId}`}>
                          <b>{post.title || '(Untitled)'}</b>
                        </Link>
                        <span className="pill">Draft</span>
                      </div>
                      <div className="muted">
                        {formatDate(post.dateCreated || post.createdAt || post.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="title" style={{ marginTop: 0 }}>
              View History (Published)
            </div>
            {filteredHistory.length === 0 ? (
              <div className="muted">No history yet.</div>
            ) : (
              <div className="list">
                {filteredHistory.map((item) => (
                  <div key={item.historyId || `${item.postId}-${item.viewDate}`} className="listItem">
                    <div className="listItem__top">
                      <Link className="link" to={`/posts/${item.postId}`}>
                        <b>Post {item.postId}</b>
                      </Link>
                      <span className="pill">Viewed</span>
                    </div>
                    <div className="muted">{formatDate(item.viewDate || item.viewedAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
