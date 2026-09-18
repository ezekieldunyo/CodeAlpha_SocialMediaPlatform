import { LogoMark } from './Logo.jsx';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <section className="auth-hero">
        <LogoMark size={64} />
        <h1>wavelink</h1>
        <p className="eyebrow">Connect. Share. Discover.</p>
      </section>
      <section className="auth-panel">
        <h2>{title}</h2>
        <p className="auth-subtitle">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}
