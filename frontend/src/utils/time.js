// Compact relative timestamps for the feed ("2h", "3d", then a date).
export function timeAgo(value) {
  const then = new Date(value.replace(' ', 'T') + 'Z');
  const seconds = Math.max(0, Math.floor((Date.now() - then.getTime()) / 1000));

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function joinedDate(value) {
  const date = new Date(value.replace(' ', 'T') + 'Z');
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
