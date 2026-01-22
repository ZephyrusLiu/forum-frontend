import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, formatDate, unwrapResult } from '../lib/endpoints.js';

export default function Home() {
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [posts, setPosts] = useState([]);

  const displayPosts = useMemo(() => {
    return (posts || []).filter((p) => {
      const st = String(p?.status ?? p?.postStatus ?? '').toLowerCase();
      const pubFlag = p?.isPublished ?? p?.published;
      return st === 'published' || pubFlag === true || st === '';
    });
  }, [posts]);

  const canCreate =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest('GET', endpoints.listPublishedPosts(), token);
        if (ignore) return;

        const data = unwrapResult(raw);
        const list = Array.isArray(data) ? data : data?.items || data?.posts || [];
        setPosts(list);
        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load posts');
        setStatus('failed');
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <PageShell title="/home" subtitle={null}>
      <div className="row">
        <div className="muted">
          Logged in as <b>{user?.userId}</b>
        </div>
        <div className="spacer" />
        {canCreate ? (
          <button className="btn" onClick={() => navigate('/posts/create')}>
            Create Post
          </button>
        ) : null}
      </div>

      {status === 'loading' ? <div className="muted">Loading…</div> : null}
      {status === 'failed' ? <div className="error">Error: {error}</div> : null}

      {status === 'succeeded' ? (
        <div className="list">
          {displayPosts.length === 0 ? (
            <div className="muted">No published posts yet.</div>
          ) : (
            displayPosts.map((p) => (
              <div key={p.id ?? p.postId ?? p._id} className="listItem">
                <div className="listItem__top">
                  <Link className="link" to={`/posts/${p.id ?? p.postId ?? p._id}`}>
                    <b>{p.title || '(Untitled)'}</b>
                  </Link>
                  <span className="pill">{String(p.status ?? p.postStatus ?? 'Published')}</span>
                </div>

                <div className="muted">
                  <span>
                    by <b>{p.userName || p.username || p.authorName || p.userId || 'Unknown'}</b>
                  </span>
                  <span className="dot">•</span>
                  <span>{formatDate(p.dateCreated || p.createdAt || p.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </PageShell>
  );
}
