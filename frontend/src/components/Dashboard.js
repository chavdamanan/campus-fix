import React from 'react';
import { Link } from 'react-router-dom';
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

async function fetchCountsForReporter(email) {
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

async function fetchAdminOverview() {
  try {
    const res = await fetch('/api/issues');
    if (!res.ok) throw new Error('failed');
    const issues = await res.json();
    const counts = computeCounts(issues);
    const unassigned = issues.filter(i => !i.assignedTo && (i.status || 'Open') !== 'Resolved').length;
    const today = new Date().toISOString().slice(0, 10);
    const resolvedToday = issues.filter(i => i.resolvedAt && String(i.resolvedAt).startsWith(today)).length;
    const uniqueReporters = new Set(
      issues.map(i => (i.reporter && i.reporter.email) || null).filter(Boolean)
    ).size;
    return { counts, unassigned, resolvedToday, uniqueReporters };
  } catch {
    const allLocal = getIssues();
    const counts = computeCounts(allLocal);
    const unassigned = allLocal.filter(i => !i.assignedTo && (i.status || 'Open') !== 'Resolved').length;
    const today = new Date().toISOString().slice(0, 10);
    const resolvedToday = allLocal.filter(i => i.resolvedAt && String(i.resolvedAt).startsWith(today)).length;
    const uniqueReporters = new Set(
      allLocal.map(i => (i.reporter && i.reporter.email) || null).filter(Boolean)
    ).size;
    return { counts, unassigned, resolvedToday, uniqueReporters };
  }
}

async function fetchWorkerOverview() {
  try {
    const res = await fetch('/api/workers');
    if (!res.ok) throw new Error('failed');
    const workers = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    const totalWorkers = workers.length;
    const presentToday = workers.filter(w =>
      Array.isArray(w.attendance) &&
      w.attendance.some(a => a.date === today && a.status === 'Present')
    ).length;
    return { totalWorkers, presentToday };
  } catch {
    return { totalWorkers: 0, presentToday: 0 };
  }
}

async function fetchBlockedUsers() {
  try {
    const res = await fetch('/api/users?blocked=true');
    if (!res.ok) throw new Error('failed');
    const users = await res.json();
    return users;
  } catch {
    return [];
  }
}

async function unblockUserApi(id) {
  const res = await fetch(`/api/users/${id}/unblock`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('failed');
  return await res.json();
}

export default function Dashboard() {
  const user = getCurrentUser();

  React.useEffect(() => {
    ensureDefaultAdmin();
  }, []);

  const isAdmin = user?.role === 'admin';

  const [counts, setCounts] = React.useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [blockedUsers, setBlockedUsers] = React.useState([]);
  const [adminExtra, setAdminExtra] = React.useState({
    unassigned: 0,
    resolvedToday: 0,
    uniqueReporters: 0,
    totalWorkers: 0,
    presentToday: 0,
  });
  const [activeTab, setActiveTab] = React.useState('dashboard'); // 'dashboard' | 'report' | 'issues'
  const [issuesVersion, setIssuesVersion] = React.useState(0);

  const loadReporterCounts = React.useCallback(async () => {
    if (!user?.email) return;
    const c = await fetchCountsForReporter(user.email);
    if (c) setCounts(c);
  }, [user?.email]);

  const loadAdminData = React.useCallback(async () => {
    const overview = await fetchAdminOverview();
    if (overview && overview.counts) {
      setCounts(overview.counts);
      setAdminExtra(prev => ({
        ...prev,
        unassigned: overview.unassigned,
        resolvedToday: overview.resolvedToday,
        uniqueReporters: overview.uniqueReporters,
      }));
    }
    const workerOverview = await fetchWorkerOverview();
    setAdminExtra(prev => ({
      ...prev,
      totalWorkers: workerOverview.totalWorkers,
      presentToday: workerOverview.presentToday,
    }));

    const blocked = await fetchBlockedUsers();
    setBlockedUsers(blocked || []);
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    } else {
      loadReporterCounts();
    }
  }, [isAdmin, loadAdminData, loadReporterCounts]);

  const handleIssueCreated = React.useCallback(() => {
    // Re-fetch stats and bump version so IssueList refreshes
    loadReporterCounts();
    setIssuesVersion(v => v + 1);
    // Switch to "My Issues" tab so user sees the new item
    setActiveTab('issues');
  }, [loadReporterCounts]);

  const initials = (user?.name || user?.email || '?')[0]?.toUpperCase?.() || '?';

  const handleUnblockUser = React.useCallback(async (id) => {
    if (!window.confirm('Unblock this user so they can log in again?')) return;
    try {
      const res = await unblockUserApi(id);
      alert(res.message || 'User unblocked');
      const blocked = await fetchBlockedUsers();
      setBlockedUsers(blocked || []);
    } catch (err) {
      console.error('Failed to unblock user', err);
      alert('Failed to unblock user');
    }
  }, []);

  // ===== Admin dashboard (no issue reporting for admin) =====
  if (isAdmin) {
    return (
      <div className="dashboard-page admin-dashboard-page">
        <header className="dashboard-header">
          <div className="dashboard-text">
            <h1 className="dashboard-title">Admin overview</h1>
            <p className="dashboard-subtitle">
              Monitor all campus issues and maintenance activity across the university.
            </p>
          </div>
          <div className="dashboard-user-pill">
            <div className="avatar-circle">{initials}</div>
            <div className="dashboard-user-meta">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
        </header>

        <section className="dashboard-stats admin-dashboard-stats" aria-label="Global issue statistics">
          <div className="stat-card">
            <div className="stat-label">Total Issues</div>
            <div className="stat-value">{counts.total}</div>
            <div className="stat-icon" aria-hidden="true">📊</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Open</div>
            <div className="stat-value">{counts.pending}</div>
            <div className="stat-icon" aria-hidden="true">🟠</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{counts.inProgress}</div>
            <div className="stat-icon" aria-hidden="true">🛠️</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved</div>
            <div className="stat-value">{counts.resolved}</div>
            <div className="stat-icon" aria-hidden="true">✅</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Unassigned issues</div>
            <div className="stat-value">{adminExtra.unassigned}</div>
            <div className="stat-icon" aria-hidden="true">📌</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved today</div>
            <div className="stat-value">{adminExtra.resolvedToday}</div>
            <div className="stat-icon" aria-hidden="true">📅</div>
          </div>
        </section>

        <section className="admin-dashboard-grid">
          <div className="card admin-highlight-card">
            <h2 className="admin-highlight-title">Issue operations</h2>
            <p className="admin-highlight-text">
              Review all reported issues, assign them to workers and update their status from a single place.
            </p>
            <div className="admin-highlight-footer">
              <Link to="/admin" className="btn small">Open issues console</Link>
              <div className="admin-highlight-meta">
                <span>{adminExtra.uniqueReporters} active reporters</span>
              </div>
            </div>
          </div>

          <div className="card admin-highlight-card admin-highlight-card--secondary">
            <h2 className="admin-highlight-title">Maintenance team</h2>
            <p className="admin-highlight-text">
              Track your worker capacity and attendance so you can balance the workload efficiently.
            </p>
            <div className="admin-highlight-footer">
              <div className="admin-highlight-metrics">
                <div>
                  <div className="admin-metric-label">Workers</div>
                  <div className="admin-metric-value">{adminExtra.totalWorkers}</div>
                </div>
                <div>
                  <div className="admin-metric-label">Present today</div>
                  <div className="admin-metric-value">{adminExtra.presentToday}</div>
                </div>
              </div>
              <Link to="/admin" className="btn small outline">View workers</Link>
            </div>
          </div>
        </section>

        <section className="card admin-blocked-card">
          <h2 className="admin-highlight-title">Blocked users</h2>
          {blockedUsers.length === 0 && (
            <p className="admin-highlight-text">No users are currently blocked.</p>
          )}
          {blockedUsers.length > 0 && (
            <div className="admin-blocked-table-wrapper">
              <table className="admin-blocked-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedUsers.map(u => (
                    <tr key={u._id}>
                      <td>{u.name || '-'}</td>
                      <td>{u.email}</td>
                      <td>{u.role}</td>
                      <td>
                        <button type="button" className="btn small" onClick={() => handleUnblockUser(u._id)}>
                          Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    );
  }

  // ===== Standard user dashboard (students / faculty / staff / workers) =====
  return (
    <div className="dashboard-page slide-in">
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

