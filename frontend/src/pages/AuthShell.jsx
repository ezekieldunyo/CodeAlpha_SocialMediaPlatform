import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

// Shared frame for Login and Register: a navy brand panel (WAVELINK wordmark
// and tagline) beside the form, with the app tile above the form on every
// screen size.
// backTo: the page a guest came from (they reach here with history.replace, so
// this link is their way back without logging in).
export default function AuthShell({ title, subtitle, children, footer, backTo }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <h1>WAVELINK</h1>
        <p className="eyebrow">Connect. Share. Discover.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          {backTo && <Link to={backTo} replace className="auth-back">← Keep browsing</Link>}
          <Logo size={88} large className="auth-logo" />
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          <p className="auth-footer muted">{footer}</p>
        </div>
      </section>
    </div>
  );
}
