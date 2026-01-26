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

  // ✅ keep original structure: still an array, but we store only ONE uploaded image URL
  const [attachmentUrls, setAttachmentUrls] = useState(['']);

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // ✅ upload state
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // IMPORTANT: publishing requires email verified (requireEmailVerified)
  const canPublish =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  const removeImage = () => setAttachmentUrls(['']); // clear

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

        const first = Array.isArray(urls) && urls.length ? String(urls[0] ?? '') : '';
        setAttachmentUrls([first || '']);

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
    const url = (attachmentUrls?.[0] ?? '').trim();
    const urls = url ? [url] : [];

    const t = title.trim();
    const c = content.trim();

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

  async function uploadImageToS3() {
    if (!imageFile) {
      setError('Choose an image file first.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const raw = await apiRequest(
        'POST',
        endpoints.requestImageUpload(),
        token,
        {
          filename: imageFile.name,
          contentType: imageFile.type || 'application/octet-stream',
        }
      );

      const data = unwrapResult(raw);
      const uploadUrl = data?.uploadUrl;
      const fileUrl = data?.fileUrl;

      if (!uploadUrl || !fileUrl) {
        throw new Error('File service did not return uploadUrl/fileUrl');
      }

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': imageFile.type || 'application/octet-stream',
        },
        body: imageFile,
      });

      if (!putRes.ok) {
        throw new Error(`S3 upload failed (${putRes.status})`);
      }

      setAttachmentUrls([fileUrl]);
      setImageFile(null);
    } catch (e) {
      setError(e?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
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
  const imageUrl = (attachmentUrls?.[0] ?? '').trim();

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

        {/* ✅ upload only (no URL input) */}
        <div className="label">Image (optional) — upload one</div>

        <div className="stack" style={{ marginTop: 12 }}>
          <div className="row">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              disabled={isLoading || uploading}
            />

            <button
              className="btn btn--ghost"
              type="button"
              onClick={uploadImageToS3}
              disabled={isLoading || uploading || !imageFile}
            >
              {uploading ? 'Uploading…' : 'Upload to S3'}
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={removeImage}
              disabled={isLoading || uploading || !imageUrl}
            >
              Remove
            </button>
          </div>

          {imageUrl ? (
            <div className="stack">
              <div className="label">Preview</div>
              <img
                src={imageUrl}
                alt="attachment"
                style={{ maxWidth: '100%', borderRadius: 10 }}
              />
            </div>
          ) : null}
        </div>

        {error ? <div className="error">Error: {error}</div> : null}

        <div className="row">
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => navigate('/home')}
            disabled={isLoading || uploading}
          >
            Cancel
          </button>

          <div className="spacer" />

          <button
            className="btn btn--ghost"
            type="button"
            disabled={isLoading || uploading || !draftId || !canPublish}
            onClick={publishPost}
            title={!draftId ? 'Save draft first' : undefined}
          >
            {isLoading ? 'Publishing…' : 'Publish'}
          </button>

          <button
            className="btn"
            type="button"
            disabled={isLoading || uploading}
            onClick={saveDraft}
          >
            {isLoading ? 'Saving…' : draftId ? 'Update Draft' : 'Save Draft'}
          </button>
        </div>
      </div>
    </PageShell>
  );
}
