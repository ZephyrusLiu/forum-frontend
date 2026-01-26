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

  // ✅ store S3 KEY in DB, but show SIGNED URL in preview
  const [attachmentKeys, setAttachmentKeys] = useState(['']); // DB value (key)
  const [previewUrl, setPreviewUrl] = useState(''); // UI only (signed url)

  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // upload state
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // publishing requires email verified (requireEmailVerified)
  const canPublish =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  const removeImage = () => {
    setAttachmentKeys(['']);
    setPreviewUrl('');
    setImageFile(null);
  };

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

        const arr =
          d?.attachments ?? d?.images ?? d?.imageUrls ?? d?.attachmentUrls ?? [];

        const firstKey =
          Array.isArray(arr) && arr.length ? String(arr[0] ?? '') : '';

        // ✅ treat attachments[0] as KEY in DB
        setAttachmentKeys([firstKey || '']);

        // ✅ if we already have a key, fetch a fresh signed URL for preview
        if (firstKey) {
          try {
            const urlRaw = await fetch(
              `http://localhost:5005/files/url?key=${encodeURIComponent(firstKey)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const urlData = await urlRaw.json().catch(() => ({}));
            if (urlRaw.ok && urlData?.url) setPreviewUrl(urlData.url);
            else setPreviewUrl('');
          } catch {
            setPreviewUrl('');
          }
        } else {
          setPreviewUrl('');
        }

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
    const key = (attachmentKeys?.[0] ?? '').trim();
    const keys = key ? [key] : [];

    const t = title.trim();
    const c = content.trim();

    if (!t) throw new Error('title is required');
    if (!c) throw new Error('content is required');

    return {
      title: t,
      content: c,
      stage: 'UNPUBLISHED',
      isArchived: false,
      attachments: keys, // ✅ store KEY in DB
    };
  }

  // ✅ Upload via FILE SERVICE (server uploads to S3) -> returns { key, url }
  // We store key in DB, and use url (signed) only for preview
  async function uploadImageToS3() {
    if (!imageFile) {
      setError('Choose an image file first.');
      return;
    }

    if (!draftId) {
      setError('Save draft first (need draftId before uploading image).');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', imageFile); // multer expects "file"
      fd.append('scope', 'posts');
      fd.append('postId', String(draftId));

      const res = await fetch('http://localhost:5005/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.message || 'Upload failed');
      }

      // After your controller change, it should return:
      // { key, url: signedUrl, expiresIn, publicUrl }
      const key = data?.key || data?.result?.key;
      const signedUrl = data?.url || data?.result?.url;

      if (!key) throw new Error('Upload ok but no key returned');
      if (!signedUrl) throw new Error('Upload ok but no signed url returned');

      setAttachmentKeys([String(key)]);
      setPreviewUrl(String(signedUrl));
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
  const hasImage = Boolean((attachmentKeys?.[0] ?? '').trim());

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
              title={!draftId ? 'Save draft first to get an id' : undefined}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>

            <button
              className="btn btn--ghost"
              type="button"
              onClick={removeImage}
              disabled={isLoading || uploading || !hasImage}
            >
              Remove
            </button>
          </div>

          {previewUrl ? (
            <div className="stack">
              <div className="label">Preview</div>
              <img
                src={previewUrl}
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
