import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import PageShell from '../components/PageShell.jsx';
import { verifyEmailThunk, verifyTokenThunk } from '../store/authSlice.js';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function VerifyEmail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const q = useQuery();

  const token = q.get('token'); // tokenized URL: /users/verify?token=xxxx
  const [email, setEmail] = useState(q.get('email') || '');
  const [code, setCode] = useState('');

  const { verifyStatus, verifyError, user } = useSelector((s) => s.auth);

  // Option B: token URL auto-verify
  useEffect(() => {
    if (token) {
      dispatch(verifyTokenThunk({ token }));
    }
  }, [token, dispatch]);

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(verifyEmailThunk({ email, code }));
  };

  const done = verifyStatus === 'succeeded';

  useEffect(() => {
    if (done && user?.userId) navigate('/home', { replace: true });
  }, [done, user, navigate]);

  return (
    <PageShell title="/users/verify">
      <div className="meta">
        Option A: enter 6-digit code. Option B: open tokenized URL to auto-verify.
      </div>

      {!token ? (
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Email (if required by backend)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>

          <label className="field">
            <span>6-digit Code</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
            />
          </label>

          {verifyError ? <div className="error">Error: {verifyError}</div> : null}
          {done ? (
            <div className="ok">
              Verified! {user?.userId ? 'Redirecting to /home…' : <>Please <Link to="/users/login">login</Link>.</>}
            </div>
          ) : null}

          <button className="btn" disabled={verifyStatus === 'loading'}>
            {verifyStatus === 'loading' ? 'Verifying…' : 'Verify'}
          </button>
        </form>
      ) : (
        <div>
          {verifyError ? <div className="error">Error: {verifyError}</div> : null}
          {done ? (
            <div className="ok">
              Verified via token URL! {user?.userId ? 'Redirecting to /home…' : <>Please <Link to="/users/login">login</Link>.</>}
            </div>
          ) : (
            <div className="hint">Verifying token…</div>
          )}
        </div>
      )}
    </PageShell>
  );
}
