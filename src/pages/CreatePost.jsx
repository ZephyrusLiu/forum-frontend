import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, unwrapResult } from '../lib/endpoints.js';

export default function CreatePost() {
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);
  const [searchParams] = useSearchParams();

  const draftId = searchParams.get('draftId'); // from Profile/Home link

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState(['']);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // IMPORTANT: publishing requires email verified (requireEmailVerified)
  const canPublish =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  const updateUrl = (idx, val) => {
    setAttachmentUrls((arr) => arr.map((x, i) => (i === idx ? val : x)));
  };

  const addUrl = () => setAttachmentUrls((arr) => [...arr, '']);
  const removeUrl = (idx) =>
    setAttachmentUrls((arr) => arr.filter((_, i) => i !== idx));

  // Prefill when editing a draft
  useEffect(() => {
    let ignore = false;

    async function loadDraft() {
      if (!draftId) return;

      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest('GET', endpoints.getMyPostById(draftId), token);
        if (ignore) return;

        const d = unwrapResult(raw);

        setTitle(d?.title ?? '');
        setContent(d?.content ?? '');

        const urls =
          d?.attachments ?? d?.images ?? d?.imageUrls ?? d?.attachmentUrls ?? [];

        setAttachmentUrls(Array.isArray(urls) && urls.length ? urls : ['']);
        setStatus('idle');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load draft');
        setStatus('failed');
      }
    }

    loadDraft();
    return () => {
      ignore = true;
    };
  }, [draftId, token]);

  function buildDraftPayload() {
    const urls = attachmentUrls.map((x) => x.trim()).filter(Boolean);

    const t = title.trim();
    const c = content.trim();

    // match backend validation: title/content required
    if (!t) throw new Error('title is required');
    if (!c) throw new Error('content is required');

    return {
      title: t,
      content: c,
      stage: 'UNPUBLISHED',
      isArchived: false,
      attachments: urls,
    };
  }

  async function saveDraft() {
    setStatus('loading');
    setError('');

    try {
      const payload = buildDraftPayload();

      if (draftId) {
        const raw = await apiRequest(
          'PATCH',
          endpoints.updatePost(draftId),
          token,
          payload
        );
        unwrapResult(raw);
      } else {
        const raw = await apiRequest('POST', endpoints.createPost(), token, payload);
        unwrapResult(raw);
      }

      navigate('/home');
    } catch (e) {
      setError(e?.message || 'Failed to save draft');
      setStatus('failed');
    }
  }

  // Publish existing draft (POST /posts/:postId/publish)
  async function publishPost() {
    if (!draftId) {
      setError('Save the draft first before publishing.');
      return;
    }

    if (!canPublish) {
      setError('You must verify your account before publishing posts.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const raw = await apiRequest('POST', endpoints.publishPost(draftId), token);
      unwrapResult(raw);

      navigate('/home');
    } catch (e) {
      setError(e?.message || 'Failed to publish post');
      setStatus('failed');
    }
  }

  const isLoading = status === 'loading';

  return (
    <PageShell
      title="/posts/create"
      subtitle={draftId ? `Editing draft ${draftId}` : null}
    >
      <div className="form">
        <label className="label">
          Title
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
          />
        </label>

        <label className="label">
          Description / Content
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write something…"
            rows={6}
          />
        </label>

        <div className="label">Attachments / Image URLs (optional)</div>
        <div className="stack">
          {attachmentUrls.map((u, idx) => (
            <div key={idx} className="row">
              <input
                className="input"
                value={u}
                onChange={(e) => updateUrl(idx, e.target.value)}
                placeholder="https://..."
              />
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => removeUrl(idx)}
                disabled={attachmentUrls.length === 1 || isLoading}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            className="btn btn--ghost"
            type="button"
            onClick={addUrl}
            disabled={isLoading}
          >
            + Add URL
          </button>
        </div>

        {error ? <div className="error">Error: {error}</div> : null}

        <div className="row">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => navigate('/home')}
            disabled={isLoading}
          >
            Cancel
          </button>

          <div className="spacer" />

          <button
            className="btn btn--ghost"
            type="button"
            disabled={isLoading || !draftId || !canPublish}
            onClick={publishPost}
            title={!draftId ? 'Save draft first' : undefined}
          >
            {isLoading ? 'Publishing…' : 'Publish'}
          </button>

          <button
            className="btn"
            type="button"
            disabled={isLoading}
            onClick={saveDraft}
          >
            {isLoading ? 'Saving…' : draftId ? 'Update Draft' : 'Save Draft'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
