import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthShell from './AuthShell.jsx';

export default function Register() {
  const { register } = useAuth();
  // Set by useRequireAuth / the guest banner: why we're here and where to go back to.
  const { state } = useLocation();
  const [fields, setFields] = useState({ display_name: '', username: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (name) => (e) => setFields((f) => ({ ...f, [name]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    // Mirror the backend's rules so most mistakes are caught before a round-trip.
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(fields.username)) {
      setError('Username must be 3-30 characters: letters, numbers, or underscore only.');
      return;
    }
    if (fields.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await register({
        display_name: fields.display_name.trim(),
        username: fields.username.trim(),
        email: fields.email.trim(),
        password: fields.password,
      });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle={state?.reason}
      backTo={state?.from}
      footer={<>Already have an account? <Link to="/login" replace state={state}>Log in</Link></>}
    >
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Name</span>
          <input className="input" value={fields.display_name} onChange={set('display_name')} maxLength={60} required autoFocus autoComplete="name" />
        </label>
        <label className="field">
          <span>Username</span>
          <div className="input-prefix">
            <span>@</span>
            <input className="input" value={fields.username} onChange={set('username')} maxLength={30} required autoComplete="username" />
          </div>
        </label>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" value={fields.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" value={fields.password} onChange={set('password')} minLength={8} required autoComplete="new-password" />
          <small className="muted">At least 8 characters.</small>
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
    </AuthShell>
  );
}
