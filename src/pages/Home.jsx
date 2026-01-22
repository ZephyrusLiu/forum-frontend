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

  const adminSections = useMemo(() => {
    const buckets = {
      published: [],
      banned: [],
      deleted: [],
    };

    (posts || []).forEach((p) => {
      const status = String(p?.status ?? p?.postStatus ?? '').toLowerCase();
      const isDeleted = p?.isDeleted === true || status === 'deleted';
      const isBanned = p?.isBanned === true || status === 'banned';
      const isPublished = status === 'published' || p?.published === true || p?.isPublished === true;

      if (isDeleted) buckets.deleted.push(p);
      else if (isBanned) buckets.banned.push(p);
      else if (isPublished) buckets.published.push(p);
    });

    return buckets;
  }, [posts]);

  const isAdmin = user?.type === 'admin' || user?.type === 'super';

  const canCreate =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest(
          'GET',
          isAdmin ? endpoints.listAllPosts() : endpoints.listPublishedPosts(),
          token,
        );
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
        isAdmin ? (
          <div className="grid2">
            {[
              { key: 'published', label: 'Published', items: adminSections.published },
              { key: 'banned', label: 'Banned', items: adminSections.banned },
              { key: 'deleted', label: 'Deleted', items: adminSections.deleted },
            ].map((section) => (
              <div key={section.key} className="card">
                <div className="title" style={{ marginTop: 0 }}>
                  {section.label}
                </div>
                {section.items.length === 0 ? (
                  <div className="muted">No posts.</div>
                ) : (
                  <div className="list">
                    {section.items.map((p) => (
                      <div key={p.id ?? p.postId ?? p._id} className="listItem">
                        <div className="listItem__top">
                          <Link className="link" to={`/posts/${p.id ?? p.postId ?? p._id}`}>
                            <b>{p.title || '(Untitled)'}</b>
                          </Link>
                          <span className="pill">{String(p.status ?? p.postStatus ?? section.label)}</span>
                        </div>
                        <div className="muted">
                          <span>
                            by <b>{p.userName || p.username || p.authorName || p.userId || 'Unknown'}</b>
                          </span>
                          <span className="dot">•</span>
                          <span>{formatDate(p.dateCreated || p.createdAt || p.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
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
        )
      ) : null}
    </PageShell>
  );
}