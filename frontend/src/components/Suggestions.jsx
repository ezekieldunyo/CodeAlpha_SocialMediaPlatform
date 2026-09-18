import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './Avatar.jsx';
import { SearchIcon } from './Icons.jsx';

export function Suggestions() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    api
      .suggestions()
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, [user?.id]);

  const follow = async (id) => {
    setPending(id);
    try {
      await api.toggleFollow(id);
      setUsers((current) => current.filter((candidate) => candidate.id !== id));
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <div className="search">
        <SearchIcon />
        <span>Search wavelink</span>
      </div>

      <div className="card">
        <h3>Who to follow</h3>
        {users.length === 0 && <p className="empty">No one new right now.</p>}
        {users.map((candidate) => (
          <div className="suggestion" key={candidate.id}>
            <Avatar user={candidate} size={36} />
            <div className="info">
              <Link to={`/u/${candidate.username}`} className="name">
                {candidate.display_name}
              </Link>
              <div className="handle">@{candidate.username}</div>
            </div>
            <button
              type="button"
              className="follow-btn"
              disabled={pending === candidate.id}
              onClick={() => follow(candidate.id)}
            >
              Follow
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
