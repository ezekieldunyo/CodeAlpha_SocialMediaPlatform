import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import UserRow from './UserRow.jsx';

export default function RightRail() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getSuggestions(5)
      .then((data) => !cancelled && setUsers(data.users))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  function setFollowing(id, following) {
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, is_following: following } : u)));
  }

  return (
    <aside className="right-rail">
      <section className="rail-card">
        <h2 className="rail-title">Who to follow</h2>
        {error && <p className="form-error rail-pad">{error}</p>}
        {!users && !error && <p className="muted small rail-pad">Loading…</p>}
        {users?.length === 0 && (
          <p className="muted small rail-pad">You're following everyone here. Nice.</p>
        )}
        {users?.map((u) => (
          <UserRow key={u.id} user={u} onFollowChange={setFollowing} compact />
        ))}
        {users?.length > 0 && (
          <Link to="/explore" className="rail-more">Show more</Link>
        )}
      </section>

      <footer className="rail-footer">
        Wavelink · CodeAlpha Full Stack Internship · {new Date().getFullYear()}
      </footer>
    </aside>
  );
}
