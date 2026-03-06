import React from 'react';
import IssueForm from './IssueForm';
import IssueList from './IssueList';
import { getCurrentUser, ensureDefaultAdmin, getIssues } from '../utils/storage';

function computeCounts(issues) {
  const total = issues.length;
  const pending = issues.filter(i => (i.status || 'Open') === 'Open').length;
  const inProgress = issues.filter(i => i.status === 'In Progress').length;
  const resolved = issues.filter(i => i.status === 'Resolved').length;
  return { total, pending, inProgress, resolved };
}

async function fetchCounts(email) {
  try {
    const res = await fetch(`/api/issues?reporterEmail=${encodeURIComponent(email)}`);
    if (!res.ok) throw new Error('failed');
    const issues = await res.json();
    return computeCounts(issues);
  } catch {
    // Fallback: use locally stored issues so counts update even if backend is down
    try {
      const allLocal = getIssues();
      const filtered = email ? allLocal.filter(i => i.reporter && i.reporter.email === email) : allLocal;
      return computeCounts(filtered);
    } catch {
      return { total: 0, pending: 0, inProgress: 0, resolved: 0 };
    }
  }
}

export default function Dashboard() {
  const user = getCurrentUser();

  React.useEffect(() => {
    ensureDefaultAdmin();
  }, []);

  const [counts, setCounts] = React.useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [activeTab, setActiveTab] = React.useState('dashboard'); // 'dashboard' | 'report' | 'issues'
  const [issuesVersion, setIssuesVersion] = React.useState(0);

  const loadCounts = React.useCallback(async () => {
    const c = await fetchCounts(user?.email);
    if (c) setCounts(c);
  }, [user?.email]);

  React.useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const handleIssueCreated = React.useCallback(() => {
    // Re-fetch stats and bump version so IssueList refreshes
    loadCounts();
    setIssuesVersion(v => v + 1);
    // Switch to "My Issues" tab so user sees the new item
    setActiveTab('issues');
  }, [loadCounts]);

  const initials = (user?.name || user?.email || '?')[0]?.toUpperCase?.() || '?';

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-text">
          <h1 className="dashboard-title">Welcome back, {user?.name || 'student'}!</h1>
          <p className="dashboard-subtitle">
            Track your reported issues and help improve campus facilities.
          </p>
        </div>
        <div className="dashboard-user-pill">
          <div className="avatar-circle">{initials}</div>
          <div className="dashboard-user-meta">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role || 'student'}</div>
          </div>
        </div>
      </header>

      {/* Tab buttons like Dashboard / Report Issue / My Issues */}
      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard views">
        <button
          type="button"
          className={`tab-pill ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
          role="tab"
          aria-selected={activeTab === 'dashboard'}
        >
          <span className="tab-icon">🏠</span>
          <span className="tab-label">Dashboard</span>
        </button>
        <button
          type="button"
          className={`tab-pill ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
          role="tab"
          aria-selected={activeTab === 'report'}
        >
          <span className="tab-icon">＋</span>
          <span className="tab-label">Report Issue</span>
        </button>
        <button
          type="button"
          className={`tab-pill ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
          role="tab"
          aria-selected={activeTab === 'issues'}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">My Issues</span>
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <section className="dashboard-stats" aria-label="Issue statistics">
            <div className="stat-card">
              <div className="stat-label">Total Issues</div>
              <div className="stat-value">{counts.total}</div>
              <div className="stat-icon" aria-hidden="true">📈</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value">{counts.pending}</div>
              <div className="stat-icon" aria-hidden="true">⏱️</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{counts.inProgress}</div>
              <div className="stat-icon" aria-hidden="true">💡</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Resolved</div>
              <div className="stat-value">{counts.resolved}</div>
              <div className="stat-icon" aria-hidden="true">✅</div>
            </div>
          </section>

          <section className="dashboard-bottom-hero">
            <div className="bottom-hero-inner">
              <div className="bottom-hero-text">
                <h2>Keep your campus running smoothly</h2>
                <p>Small reports lead to big improvements. Track patterns, spot recurring issues, and help your college stay world‑class.</p>
              </div>
              <div className="bottom-hero-grid">
                <div className="bottom-chip">
                  <span className="chip-icon">⚡</span>
                  <div className="chip-label">Fast response to critical issues</div>
                </div>
                <div className="bottom-chip">
                  <span className="chip-icon">📊</span>
                  <div className="chip-label">See trends across departments</div>
                </div>
                <div className="bottom-chip">
                  <span className="chip-icon">🤝</span>
                  <div className="chip-label">Collaborate with admin & staff</div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === 'report' && (
        <section className="dashboard-panel">
          <IssueForm onCreated={handleIssueCreated} />
        </section>
      )}

      {activeTab === 'issues' && (
        <section className="dashboard-panel">
          <IssueList refreshKey={issuesVersion} />
        </section>
      )}
    </div>
  );
}

