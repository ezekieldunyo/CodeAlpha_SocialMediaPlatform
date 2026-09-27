import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import FollowButton from './FollowButton.jsx';

// One person in a list: suggestions, Explore, followers/following.
export default function UserRow({ user, onFollowChange, onNavigate, compact = false }) {
  const { user: me } = useAuth();

  return (
    <div className={`user-row ${compact ? 'compact' : ''}`}>
      <Link to={`/u/${user.username}`} className="user-row-link" onClick={onNavigate}>
        <Avatar user={user} size={compact ? 40 : 44} />
        <span className="user-row-text">
          <strong className="truncate">{user.display_name}</strong>
          <span className="muted truncate">@{user.username}</span>
          {!compact && user.bio && <span className="user-row-bio">{user.bio}</span>}
        </span>
      </Link>
      {user.id !== me?.id && (
        <FollowButton
          userId={user.id}
          following={user.is_following}
          onChange={({ following }) => onFollowChange(user.id, following)}
        />
      )}
    </div>
  );
}
