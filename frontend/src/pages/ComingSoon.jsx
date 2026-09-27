export default function ComingSoon({ title }) {
  return (
    <>
      <header className="page-header sticky">
        <h1>{title}</h1>
      </header>
      <div className="empty">
        <strong>{title} are on the way.</strong>
        <p>This part of wavelink isn't built yet.</p>
      </div>
    </>
  );
}
