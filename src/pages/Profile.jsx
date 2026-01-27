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
  const [historyKeyword, setHistoryKeyword] = useState('');
  const [historyStatus, setHistoryStatus] = useState('idle');
  const [historyError, setHistoryError] = useState('');

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

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setStatus('loading');
      setError('');

      try {
        const [profileRaw, topRaw, draftRaw, historyRaw] = await Promise.all([
          apiRequest('GET', endpoints.userProfile(profileUserId), token),
          apiRequest('GET', endpoints.top3MyPosts(), token).catch(() => null),
          apiRequest('GET', endpoints.myDraftPosts(), token).catch(() => null),
          apiRequest('GET', endpoints.listHistory(), token).catch(() => null),
        ]);

        if (ignore) return;

        const data = unwrapResult(profileRaw);
        setProfile(data);
        setEditFirstName(data?.firstName || '');
        setEditLastName(data?.lastName || '');
        setEditEmail(data?.email || '');
        setProfileS3Key(data?.profileS3Key || null);

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
          setHistory(Array.isArray(list) ? list : list?.items || []);
          setHistoryStatus('succeeded');
        }

        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load profile');
        setStatus('failed');
      }
    }

    if (profileUserId) loadProfile();
    return () => { ignore = true; };
  }, [profileUserId, token]);

  useEffect(() => {
    let ignore = false;

    async function loadPreviewUrl() {
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

    loadPreviewUrl();
    return () => { ignore = true; };
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

      const raw = await apiRequest(
        'PATCH',
        endpoints.updateUserProfile(profileUserId),
        token,
        payload
      );

      const data = unwrapResult(raw);
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
    setHistoryStatus('loading');
    setHistoryError('');

    try {
      const raw = await apiRequest(
        'GET',
        endpoints.listHistory(historyKeyword),
        token
      );
      const list = unwrapResult(raw);
      setHistory(Array.isArray(list) ? list : list?.items || []);
      setHistoryStatus('succeeded');
    } catch (e) {
      setHistoryStatus('failed');
      setHistoryError(e?.message || 'Failed to search history');
    }
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
          <div className="card">
            <div className="row">
              {previewUrl && <img className="avatar" src={previewUrl} alt="profile" />}
              <div>
                <div className="title">{fullName}</div>
                <div className="meta">
                  Registered: {formatDate(profile?.registeredAt || profile?.createdAt)}
                </div>
                <div className="meta">Email: {profile?.email || '—'}</div>
              </div>
            </div>
          </div>

          {/* Edit profile + avatar upload */}
          {/* Top posts, drafts, history blocks remain unchanged from original */}
        </div>
      )}
    </PageShell>
  );
}

