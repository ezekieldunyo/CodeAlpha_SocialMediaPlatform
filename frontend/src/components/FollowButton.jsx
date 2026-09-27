import { useState } from 'react';
import { api } from '../api.js';
import useRequireAuth from '../hooks/useRequireAuth.js';

// "Follow" is a primary (gradient) action; once following it drops to an
// outline button that reads "Unfollow" on hover. Guests see "Follow" and are
// sent to log in when they press it.
export default function FollowButton({ userId, following, onChange, size = 'sm' }) {
  const requireAuth = useRequireAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (!requireAuth('Log in to follow people.')) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.toggleFollow(userId);
      onChange?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className={`btn btn-${size} ${following ? 'btn-outline btn-following' : 'btn-primary'}`}
      onClick={toggle}
      disabled={busy}
      title={error || undefined}
      aria-pressed={following}
    >
      {following ? (
        <>
          <span className="label-default">Following</span>
          <span className="label-hover">Unfollow</span>
        </>
      ) : (
        'Follow'
      )}
    </button>
  );
}
