export default function PageShell({ title, subtitle = 'Coming soon', children }) {
  const showSubtitle =
    subtitle !== null && subtitle !== undefined && String(subtitle).trim().length > 0;

  return (
    <section className="card">
      <div className="title">{title}</div>
      {showSubtitle ? <div className="meta">{subtitle}</div> : null}
      {children ? <div className="content">{children}</div> : null}
    </section>
  );
}
