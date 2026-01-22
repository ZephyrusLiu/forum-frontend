import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, formatDate, unwrapResult } from '../lib/endpoints.js';

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return !!v;
}

export default function PostDetail() {
  const { postId } = useParams();
  const { token, user } = useSelector((s) => s.auth);

  const myUserId = user?.userId;

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);

  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('idle');
  const [replyError, setReplyError] = useState('');

  const isPublished = useMemo(() => {
    const st = String(post?.status ?? post?.postStatus ?? '').toLowerCase();
    if (st) return st === 'published';
    if (post && (post.isPublished !== undefined || post.published !== undefined)) {
      return toBool(post.isPublished ?? post.published);
    }
    return true;
  }, [post]);

  const attachments = useMemo(() => {
    const a = post?.attachments || post?.images || post?.imageUrls || [];
    return Array.isArray(a) ? a : [];
  }, [post]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest('GET', endpoints.postDetail(postId), token);
        if (ignore) return;

        const data = unwrapResult(raw);
        const detail = data?.post ?? data;
        const replyList = data?.replies ?? detail?.replies ?? [];

        setPost(detail || null);
        setReplies(Array.isArray(replyList) ? replyList : []);
        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load post');
        setStatus('failed');
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [postId, token]);

  // Trigger history write on open (Published only)
  useEffect(() => {
    if (!post) return;

    async function writeHistory() {
      try {
        if (!isPublished) return;

        const pid = post?.id || post?.postId || post?._id || postId;
        const st = post?.status || post?.postStatus || 'Published';

        await apiRequest('POST', endpoints.createHistory(), token, {
          postId: String(pid),
          published: true,
          // optional compatibility keys (safe if backend ignores unknown fields)
          isPublished: true,
          postStatus: String(st),
        });
      } catch {
        // do not block UI
      }
    }

    writeHistory();
  }, [post, isPublished, postId, token]);

  async function deleteReply(replyId) {
    try {
      await apiRequest('DELETE', endpoints.deleteReply(replyId), token);
      setReplies((arr) =>
        arr.filter((r) => String(r?.id || r?.replyId || r?._id) !== String(replyId)),
      );
    } catch (e) {
      alert(e?.message || 'Failed to delete reply');
    }
  }

  async function createReply() {
    const text = replyText.trim();
    if (!text) return;

    setReplyStatus('loading');
    setReplyError('');

    try {
      const raw = await apiRequest('POST', endpoints.createReply(postId), token, {
        content: text,
        message: text,
      });
      const data = unwrapResult(raw);
      const created = data?.reply || data;

      setReplies((arr) => [created, ...arr]);
      setReplyText('');
      setReplyStatus('succeeded');
    } catch (e) {
      setReplyError(e?.message || 'Failed to create reply');
      setReplyStatus('failed');
    }
  }

  if (status === 'loading') {
    return (
      <PageShell title={`/posts/${postId}`} subtitle={null}>
        Loading…
      </PageShell>
    );
  }

  if (status === 'failed') {
    return (
      <PageShell title={`/posts/${postId}`} subtitle={null}>
        <div className="error">Error: {error}</div>
      </PageShell>
    );
  }

  const authorName =
    post?.userName || post?.username || post?.authorName || post?.userId || 'Unknown';
  const authorImg = post?.profileImageURL || post?.profileImageUrl || post?.userProfileImageURL;

  const canReply =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  const canPublish =
    !isPublished && (user?.type === 'admin' || user?.type === 'super' || String(myUserId) === String(post?.userId));

  async function publishPost() {
    try {
      const raw = await apiRequest('PATCH', endpoints.updatePost(postId), token, {
        status: 'Published',
        isPublished: true,
        published: true,
      });
      const updated = unwrapResult(raw);
      setPost((prev) => ({ ...(prev || {}), ...(updated || {}), status: 'Published', published: true }));
    } catch (e) {
      alert(e?.message || 'Failed to publish post');
    }
  }

  return (
    <PageShell title={`/posts/${postId}`} subtitle={null}>
      <div className="stack">
        <div className="row">
          <div className="title" style={{ marginTop: 0 }}>
            {post?.title || '(Untitled)'}
          </div>
          <div className="spacer" />
          <span className="pill">
            {post?.status || post?.postStatus || (isPublished ? 'Published' : 'Unpublished')}
          </span>
        </div>

        <div className="row">
          {authorImg ? <img className="avatar" src={authorImg} alt="author" /> : null}
          <div className="muted">
            by <b>{authorName}</b>
            <span className="dot">•</span>
            {formatDate(post?.dateCreated || post?.createdAt || post?.created_at)}
            {post?.dateModified || post?.updatedAt || post?.updated_at ? (
              <>
                <span className="dot">•</span>
                last edited {formatDate(post?.dateModified || post?.updatedAt || post?.updated_at)}
              </>
            ) : null}
          </div>
        </div>

        <div className="contentBox">
          {post?.content || post?.description || post?.body || '(No content)'}
        </div>

        {attachments.length > 0 ? (
          <div className="stack">
            <div className="label">Attachments / Images</div>
            <div className="grid">
              {attachments.map((u, idx) => (
                <a key={idx} className="link" href={u} target="_blank" rel="noreferrer">
                  {u}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="divider" />

        <div className="row">
          <div className="label">Replies ({replies.length})</div>
          <div className="spacer" />
          <Link className="link" to="/home">
            Back to Home
          </Link>
        </div>

        <div className="stack">
          {replies.length === 0 ? (
            <div className="muted">No replies yet.</div>
          ) : (
            replies.map((r) => {
              const rid = r?.id || r?.replyId || r?._id;
              const ownerId = r?.userId || r?.ownerId;
              const canDelete = myUserId && ownerId && String(myUserId) === String(ownerId);

              const replierName =
                r?.userName || r?.username || r?.authorName || r?.userId || 'Unknown';
              const replierImg = r?.profileImageURL || r?.profileImageUrl;
              const inactive = r?.isActive === false;

              return (
                <div key={rid} className="reply">
                  <div className="row">
                    {replierImg ? (
                      <img className="avatar avatar--sm" src={replierImg} alt="replier" />
                    ) : null}
                    <div className="muted">
                      <b>{replierName}</b>
                      <span className="dot">•</span>
                      {formatDate(r?.dateCreated || r?.createdAt || r?.created_at)}
                      {inactive ? (
                        <>
                          <span className="dot">•</span>
                          <span className="pill">deleted</span>
                        </>
                      ) : null}
                    </div>
                    <div className="spacer" />
                    {canDelete && !inactive ? (
                      <button className="btn btn--ghost" onClick={() => deleteReply(rid)}>
                        Delete
                      </button>
                    ) : null}
                  </div>

                  <div className="contentBox">
                    {inactive ? (
                      <i className="muted">(This reply was deleted.)</i>
                    ) : (
                      r?.content || r?.message || r?.body
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="divider" />

        <div className="stack">
          <div className="label">Add a reply</div>
          <textarea
            className="textarea"
            rows={3}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={canReply ? 'Write a reply…' : 'Verify email to reply…'}
            disabled={!canReply}
          />
          {replyError ? <div className="error">Error: {replyError}</div> : null}
          <button className="btn" disabled={!canReply || replyStatus === 'loading'} onClick={createReply}>
            {replyStatus === 'loading' ? 'Posting…' : 'Post Reply'}
          </button>
          <div className="hint">
            Note: backend enforces verified/admin rules and archive rules (Day3+).
          </div>
        </div>
      </div>
    </PageShell>
  );
}
