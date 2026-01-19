export default function PageShell({ title, children }) {
  return (
    <section className="card">
      <div className="title">{title}</div>
      <div className="meta">Coming soon</div>
      {children ? <div className="content">{children}</div> : null}
    </section>
  );
}
