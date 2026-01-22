import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, formatDate, unwrapResult } from '../lib/endpoints.js';

export default function AdminMessages() {
  const { token } = useSelector((s) => s.auth);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest('GET', endpoints.adminListMessages(), token);
        if (ignore) return;
        const data = unwrapResult(raw);
        setMessages(Array.isArray(data) ? data : data?.items || []);
        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load messages');
        setStatus('failed');
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [token]);

  const updateStatus = async (messageId, nextStatus) => {
    try {
      await apiRequest('PATCH', endpoints.adminUpdateMessageStatus(messageId), token, { status: nextStatus });
      setMessages((prev) =>
        prev.map((m) => (String(m.id || m.messageId) === String(messageId) ? { ...m, status: nextStatus } : m)),
      );
    } catch (e) {
      alert(e?.message || 'Failed to update message status');
    }
  };
  return (
    <PageShell title="/messages (Admin Messages)">
      {status === 'loading' ? <div className="muted">Loading…</div> : null}
      {status === 'failed' ? <div className="error">Error: {error}</div> : null}

      {status === 'succeeded' ? (
        messages.length === 0 ? (
          <div className="muted">No messages found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Message ID</th>
                <th>From</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => {
                const id = m.id || m.messageId;
                const statusText = String(m.status || '').toLowerCase();
                const isClosed = statusText === 'closed';
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{m.from || m.email || '—'}</td>
                    <td>{m.subject || m.title || '—'}</td>
                    <td>{m.status || 'open'}</td>
                    <td>{formatDate(m.createdAt || m.dateCreated)}</td>
                    <td>
                      <button
                        className="btn btn--ghost"
                        onClick={() => updateStatus(id, isClosed ? 'open' : 'closed')}
                      >
                        {isClosed ? 'Reopen' : 'Close'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      ) : null}
    </PageShell>
  );
}