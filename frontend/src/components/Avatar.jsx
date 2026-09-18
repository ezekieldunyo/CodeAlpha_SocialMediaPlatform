import { Link } from 'react-router-dom';

// Falls back to the gradient disc with the user's initial when there is no
// uploaded avatar.
export function Avatar({ user, size = 40, linked = true }) {
  const initial = (user?.display_name ?? user?.username ?? '?').trim().charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };

  const content = user?.avatar_url ? (
    <img className="avatar" style={style} src={user.avatar_url} alt={user.display_name} />
  ) : (
    <span className="avatar" style={style} aria-hidden="true">
      {initial}
    </span>
  );

  if (!linked || !user?.username) return content;
  return (
    <Link to={`/u/${user.username}`} className="avatar-link" aria-label={user.display_name}>
      {content}
    </Link>
  );
}
