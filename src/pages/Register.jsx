import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import PageShell from '../components/PageShell.jsx';
import { registerThunk } from '../store/authSlice.js';

export default function Register() {
  const dispatch = useDispatch();
  const { registerStatus, registerError } = useSelector((s) => s.auth);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    await dispatch(registerThunk({ firstName, lastName, email, password }));
  };

  const success = registerStatus === 'succeeded';

  return (
    <PageShell title="/users/register">
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>First Name</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>

        <label className="field">
          <span>Last Name</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            type="password"
            autoComplete="new-password"
          />
        </label>

        {registerError ? <div className="error">Error: {registerError}</div> : null}
        {success ? (
          <div className="ok">
            Registered! Please verify your email. Go to <Link to="/users/verify">/users/verify</Link>.
          </div>
        ) : null}

        <button className="btn" disabled={registerStatus === 'loading'}>
          {registerStatus === 'loading' ? 'Registering…' : 'Register'}
        </button>
      </form>
    </PageShell>
  );
}
