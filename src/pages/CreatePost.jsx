import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, unwrapResult } from '../lib/endpoints.js';

export default function CreatePost() {
  const navigate = useNavigate();
  const { token, user } = useSelector((s) => s.auth);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState(['']);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const canCreate =
    user?.status === 'active' || user?.type === 'admin' || user?.type === 'super';

  const updateUrl = (idx, val) => {
    setAttachmentUrls((arr) => arr.map((x, i) => (i === idx ? val : x)));
  };

  const addUrl = () => setAttachmentUrls((arr) => [...arr, '']);
  const removeUrl = (idx) => setAttachmentUrls((arr) => arr.filter((_, i) => i !== idx));

  async function submit(publish) {
    if (!canCreate) {
      setError('Your account is not allowed to create posts until verified.');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const urls = attachmentUrls.map((x) => x.trim()).filter(Boolean);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        status: publish ? 'Published' : 'Unpublished',
        isPublished: publish,
        published: publish,
        attachments: urls,
        images: urls,
        imageUrls: urls,
      };

      const raw = await apiRequest('POST', endpoints.createPost(), token, payload);
      const data = unwrapResult(raw);

      const id = data?.id || data?.postId || data?._id;
      if (id) navigate(`/posts/${id}`);
      else navigate('/home');
    } catch (e) {
      setError(e?.message || 'Failed to create post');
      setStatus('failed');
    }
  }

  return (
    <PageShell title="/posts/create" subtitle={null}>
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
                disabled={attachmentUrls.length === 1}
              >
                Remove
              </button>
            </div>
          ))}
          <button className="btn btn--ghost" type="button" onClick={addUrl}>
            + Add URL
          </button>
        </div>

        {error ? <div className="error">Error: {error}</div> : null}

        <div className="row">
          <button className="btn btn--ghost" type="button" onClick={() => navigate('/home')}>
            Cancel
          </button>
          <div className="spacer" />
          <button
            className="btn"
            type="button"
            disabled={status === 'loading' || !canCreate}
            onClick={() => submit(false)}
          >
            {status === 'loading' ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            className="btn"
            type="button"
            disabled={status === 'loading' || !canCreate}
            onClick={() => submit(true)}
          >
            {status === 'loading' ? 'Publishing…' : 'Publish'}
          </button>
        </div>

        <div className="hint">
          Backend note: if Post service uses different field names/paths, adjust
          <code style={{ marginLeft: 6 }}>/src/lib/endpoints.js</code> and payload keys here.
        </div>
      </div>
    </PageShell>
  );
}
