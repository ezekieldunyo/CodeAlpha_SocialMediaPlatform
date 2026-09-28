// The wavelink app tile (frontend/public/wavelink-logo-*.png). The PNG is
// already a rounded, dark tile with transparent corners, so it is shown as-is:
// no background, border, radius or filter is added around it.
//
// Small spots (sidebar, mobile header) use the 128px file, which stays sharp
// up to 3x screens at those sizes; large spots use the 512px file. width and
// height are always set so the page doesn't shift while the image loads.
export default function Logo({ size = 32, large = false, className = '' }) {
  return (
    <img
      className={`logo-tile ${className}`.trim()}
      src={large ? '/wavelink-logo-512.png' : '/wavelink-logo-128.png'}
      width={size}
      height={size}
      alt="wavelink"
      decoding="async"
      draggable="false"
    />
  );
}
