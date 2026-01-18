export default function App() {
  const buildDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <header className="card">
        <div className="badge">PR Demo</div>
        <div className="title">✅ Minimal web demo is live</div>
        <div className="meta">build: {buildDate}</div>
      </header>

      <main className="card">
        <h2 className="h2">What this proves</h2>
        <ul className="list">
          <li>Repo can run locally (npm install / npm run dev)</li>
          <li>Small change is easy to review in a PR</li>
          <li>No backend required</li>
        </ul>

        <div className="hint">
          Tip: Put your Jira key in the PR title/branch/commit for the PR demo.
        </div>
      </main>
    </div>
  );
}
