export function LogoMark({ size = 30 }) {
  return (
    <svg viewBox="0 0 400 300" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="wl-a" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="wl-b" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C1A4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <g transform="rotate(-6 200 150)">
        <path
          d="M65,92 C102,175 133,222 160,234 C186,220 208,158 228,100"
          fill="none"
          stroke="url(#wl-a)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M175,84 C204,164 230,216 252,229 C276,216 304,152 335,94"
          fill="none"
          stroke="url(#wl-b)"
          strokeWidth="24"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="65" cy="92" r="13" fill="#2DD4BF" />
        <circle cx="335" cy="94" r="13" fill="#2563EB" />
      </g>
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="brand">
      <LogoMark />
      <span>wavelink</span>
    </div>
  );
}
