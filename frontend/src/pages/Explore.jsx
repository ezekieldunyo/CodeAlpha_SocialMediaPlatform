import { useEffect, useState } from 'react';
import { api } from '../api.js';
import UserRow from '../components/UserRow.jsx';

export default function Explore() {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .getSuggestions(30)
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
    <>
      <header className="page-header sticky">
        <h1>Explore</h1>
        <p className="page-sub muted">People you might want to follow</p>
      </header>
      {error && <p className="form-error pad">{error}</p>}
      {!users && !error && <div className="list-status"><span className="spinner" aria-label="Loading" /></div>}
      {users?.length === 0 && (
        <div className="empty">
          <strong>No one new to suggest.</strong>
          <p>You're already following everyone on Wavelink.</p>
        </div>
      )}
      <div className="user-list">
        {users?.map((u) => (
          <UserRow key={u.id} user={u} onFollowChange={setFollowing} />
        ))}
      </div>
    </>
  );
}
