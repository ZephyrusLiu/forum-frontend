import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import PageShell from '../components/PageShell.jsx';
import { apiRequest } from '../lib/apiClient.js';
import { endpoints, unwrapResult } from '../lib/endpoints.js';

export default function AdminUsers() {
  const { token, user } = useSelector((s) => s.auth);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function run() {
      setStatus('loading');
      setError('');

      try {
        const raw = await apiRequest('GET', endpoints.adminListUsers(), token);
        if (ignore) return;
        const data = unwrapResult(raw);
        setUsers(Array.isArray(data) ? data : data?.items || []);
        setStatus('succeeded');
      } catch (e) {
        if (ignore) return;
        setError(e?.message || 'Failed to load users');
        setStatus('failed');
      }
    }

    run();
    return () => {
      ignore = true;
    };
  }, [token]);

  const updateStatus = async (userId, nextStatus) => {
    try {
      await apiRequest('PATCH', endpoints.adminUpdateUserStatus(userId), token, { status: nextStatus });
      setUsers((prev) =>
        prev.map((u) => (String(u.userId || u.id) === String(userId) ? { ...u, status: nextStatus } : u)),
      );
    } catch (e) {
      alert(e?.message || 'Failed to update user status');
    }
  };

  const updateRole = async (userId, nextType) => {
    try {
      await apiRequest('PATCH', endpoints.adminUpdateUserRole(userId), token, { type: nextType });
      setUsers((prev) =>
        prev.map((u) => (String(u.userId || u.id) === String(userId) ? { ...u, type: nextType } : u)),
      );
    } catch (e) {
      alert(e?.message || 'Failed to update user role');
    }
  };

  const isSuperAdmin = user?.type === 'super';
  return (
    <PageShell title="/users (Admin Users)">
      {status === 'loading' ? <div className="muted">Loading…</div> : null}
      {status === 'failed' ? <div className="error">Error: {error}</div> : null}

      {status === 'succeeded' ? (
        users.length === 0 ? (
          <div className="muted">No users found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
                {isSuperAdmin ? <th>Promote</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const id = u.userId || u.id;
                const statusText = String(u.status || '').toLowerCase();
                const isBanned = statusText === 'banned';
                const isAdmin = (u.type || u.role) === 'admin';
                return (
                  <tr key={id}>
                    <td>{id}</td>
                    <td>{u.email || '—'}</td>
                    <td>{u.type || u.role || 'user'}</td>
                    <td>{u.status || 'active'}</td>
                    <td>
                      <button
                        className="btn btn--ghost"
                        onClick={() => updateStatus(id, isBanned ? 'active' : 'banned')}
                      >
                        {isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </td>
                    {isSuperAdmin ? (
                      <td>
                        <button
                          className="btn btn--ghost"
                          onClick={() => updateRole(id, isAdmin ? 'user' : 'admin')}
                        >
                          {isAdmin ? 'Demote' : 'Promote'}
                        </button>
                      </td>
                    ) : null}
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