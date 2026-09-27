import { useState } from 'react';
import { api } from '../api.js';

// "Follow" is a primary (gradient) action; once following it drops to an
// outline button that reads "Unfollow" on hover.
export default function FollowButton({ userId, following, onChange, size = 'sm' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
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
