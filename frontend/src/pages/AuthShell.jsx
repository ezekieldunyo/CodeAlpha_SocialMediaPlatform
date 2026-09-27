import { Link } from 'react-router-dom';
import { GradientDefs, LogoMark } from '../components/Icons.jsx';

// Shared frame for Login and Register. The brand panel reproduces
// wavelink-hero.svg in HTML so the Poppins wordmark renders with the web font.
// backTo: the page a guest came from (they reach here with history.replace, so
// this link is their way back without logging in).
export default function AuthShell({ title, subtitle, children, footer, backTo }) {
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
          {backTo && <Link to={backTo} replace className="auth-back">← Keep browsing</Link>}
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
