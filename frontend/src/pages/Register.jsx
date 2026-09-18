import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AuthShell } from '../components/AuthShell.jsx';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ display_name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
      navigate('/');
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setBusy(false);
    }
  };

  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value });

  return (
    <AuthShell title="Join wavelink" subtitle="Connect. Share. Discover.">
      <form onSubmit={submit}>
        <label>
          Display name
          <input required maxLength={60} value={form.display_name} onChange={update('display_name')} />
        </label>
        <label>
          Username
          <input
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]+"
            title="Letters, numbers and underscores only"
            value={form.username}
            onChange={update('username')}
          />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={update('email')} />
        </label>
        <label>
          Password
          <input type="password" required minLength={8} value={form.password} onChange={update('password')} />
          <small>At least 8 characters.</small>
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="post-cta wide" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="auth-switch">
        Already here? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
