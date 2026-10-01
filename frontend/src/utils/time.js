// The API returns MySQL timestamps like "2026-09-27 14:03:11", always in UTC
// (see backend/config/database.php), wherever the server is. "T" and "Z" make
// Date read it as UTC; everything shown is then in the visitor's own time.
export function parseTimestamp(value) {
  return new Date(`${String(value).replace(' ', 'T')}Z`);
}

export function timeAgo(value) {
  const date = parseTimestamp(value);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)}d`;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
}

export function monthYear(value) {
  return parseTimestamp(value).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function compactNumber(n) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}
