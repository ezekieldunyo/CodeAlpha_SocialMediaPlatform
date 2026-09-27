import { useState } from 'react';

// Falls back to initials on a tinted circle when there's no avatar_url
// (or when the URL fails to load). The tint is derived from the username
// so each person keeps the same colour everywhere.
const TINTS = ['#0E7490', '#1D4ED8', '#0F766E', '#4338CA', '#0369A1', '#155E75'];

function tintFor(name = '') {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export default function Avatar({ user, size = 44 }) {
  const [broken, setBroken] = useState(false);
  const label = user?.display_name || user?.username || '?';
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (user?.avatar_url && !broken) {
    return (
      <img
        className="avatar"
        src={user.avatar_url}
        alt=""
        style={style}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span className="avatar avatar-initials" style={{ ...style, background: tintFor(user?.username) }} aria-hidden="true">
      {initials}
    </span>
  );
}
