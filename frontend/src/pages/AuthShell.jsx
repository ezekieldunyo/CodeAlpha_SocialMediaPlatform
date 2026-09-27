import { GradientDefs, LogoMark } from '../components/Icons.jsx';

// Shared frame for Login and Register. The brand panel reproduces
// wavelink-hero.svg in HTML so the Poppins wordmark renders with the web font.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <GradientDefs />
      <section className="auth-brand">
        <div className="auth-brand-mark"><LogoMark size={150} /></div>
        <h1>WAVELINK</h1>
        <p className="eyebrow">Connect. Share. Discover.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo"><LogoMark size={36} /></div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          <p className="auth-footer muted">{footer}</p>
        </div>
      </section>
    </div>
  );
}
