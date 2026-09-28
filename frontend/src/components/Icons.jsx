// Inline stroke icons (24px grid, currentColor) so there's no icon-font dependency.

function Icon({ children, size = 22, filled = false, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p) => (
  <Icon {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Icon>
);
export const ExploreIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Icon>
);
export const BellIcon = (p) => (
  <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></Icon>
);
export const MailIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6 8.5 7 8.5-7" /></Icon>
);
export const UserIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Icon>
);
export const MoreIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12h.01M12 12h.01M16 12h.01" strokeWidth="2.6" /></Icon>
);
export const FeatherIcon = (p) => (
  <Icon {...p}><path d="M20 4c-7 0-12 5-12 12v4" /><path d="M8 16h6c4 0 6-5 6-12" /><path d="M4 20l4-4" /></Icon>
);
export const HeartIcon = (p) => (
  <Icon {...p}><path d="M12 20s-7.5-4.6-9.2-9.3C1.7 7.4 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.5 3.4 4.4 6.7C19.5 15.4 12 20 12 20z" /></Icon>
);
export const CommentIcon = (p) => (
  <Icon {...p}><path d="M4 5h16v11H9l-5 4z" /></Icon>
);
export const TrashIcon = (p) => (
  <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></Icon>
);
export const ImageIcon = (p) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-5-9 9" /></Icon>
);
export const CloseIcon = (p) => (
  <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>
);
export const LogoutIcon = (p) => (
  <Icon {...p}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 16l-4-4 4-4M6 12h10" /></Icon>
);
export const BackIcon = (p) => (
  <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>
);
export const CalendarIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Icon>
);

// Shared gradient. wl-grad is in user space (0-24) so it also paints thin,
// straight strokes on the 24px icons — objectBoundingBox would collapse there.
// Used by the active nav icon and the liked heart.
export function GradientDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="wl-grad" gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22">
          <stop offset="0" stopColor="#2DD4BF" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
    </svg>
  );
}
