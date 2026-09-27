import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import UserRow from './UserRow.jsx';

// Suggestions need to know who's asking, so guests get a sign-up card instead.
function GuestCard() {
  const { pathname } = useLocation();
  return (
    <section className="rail-card">
      <h3 className="rail-title">New to wavelink?</h3>
      <p className="muted small rail-note">Sign up to post, like, comment and follow people.</p>
      <Link to="/register" replace state={{ from: pathname }} className="btn btn-primary btn-block rail-cta">
        Create account
      </Link>
    </section>
  );
}

function Suggestions() {
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
    <section className="rail-card">
      <h3 className="rail-title">Who to follow</h3>
      {error && <p className="form-error rail-note">{error}</p>}
      {!users && !error && <p className="muted small rail-note">Loading…</p>}
      {users?.length === 0 && (
        <p className="muted small rail-note">You're following everyone here. Nice.</p>
      )}
      {users?.map((u) => (
        <UserRow key={u.id} user={u} onFollowChange={setFollowing} compact />
      ))}
      {users?.length > 0 && (
        <Link to="/explore" className="rail-more">Show more</Link>
      )}
    </section>
  );
}

export default function RightRail() {
  const { user } = useAuth();
  return (
    <aside className="right-rail">
      {user ? <Suggestions /> : <GuestCard />}
      <footer className="rail-footer">
        wavelink · CodeAlpha Full Stack Internship · {new Date().getFullYear()}
      </footer>
    </aside>
  );
}
