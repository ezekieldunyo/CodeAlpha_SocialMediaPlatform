import { LogoMark } from '../components/Icons.jsx';

// Shared frame for Login and Register: navy brand panel + form.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <LogoMark size={56} />
        <h1>Wavelink</h1>
        <p>Catch the wave. Share what's happening, follow the people you care about, and join the conversation.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo"><LogoMark size={40} /></div>
          <h2>{title}</h2>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          <p className="auth-footer muted">{footer}</p>
        </div>
      </section>
    </div>
  );
}
