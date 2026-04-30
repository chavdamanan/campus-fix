import React from 'react';
import { getIssues, updateIssue, deleteIssueLocal } from '../utils/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '/';

async function fetchAllIssuesApi() {
  const res = await fetch(`${API_BASE}/api/issues`);
  if (!res.ok) throw new Error('failed to fetch');
  return await res.json();
}

async function updateIssueStatusApi(issue) {
  const res = await fetch(`${API_BASE}/api/issues/${issue._id || issue.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issue)
  });
  if (!res.ok) throw new Error('failed to update issue');
  return await res.json();
}

async function fetchWorkersApi() {
  const res = await fetch(`${API_BASE}/api/workers`);
  if (!res.ok) throw new Error('failed to fetch workers');
  return await res.json();
}

async function assignIssueApi(id, workerId) {
  const res = await fetch(`${API_BASE}/api/issues/${id}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerId })
  });
  if (!res.ok) throw new Error('failed to assign issue');
  return await res.json();
}

async function deleteIssueApi(id) {
  const res = await fetch(`${API_BASE}/api/issues/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('failed to delete issue');
  return await res.json();
}

async function blockReporterApi(id) {
  const res = await fetch(`${API_BASE}/api/issues/${id}/block-reporter`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('failed to block user');
  return await res.json();
}

// Alias for compatibility
const updateIssueApi = updateIssueStatusApi;

export default function AdminPanel() {
  const [issues, setIssues] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('dashboard'); // 'dashboard' | 'issues' | 'workers'
  const [historyIssue, setHistoryIssue] = React.useState(null);
  const [filterCategory, setFilterCategory] = React.useState('All');
  const [selectedWorkerDetail, setSelectedWorkerDetail] = React.useState(null);

  // Chart Data preparation
  const issuesOverTime = React.useMemo(() => {
    const dates = {};
    issues.forEach(i => {
      const date = new Date(i.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dates[date] = (dates[date] || 0) + 1;
    });
    return Object.entries(dates)
      .map(([date, count]) => ({ date, count })); // Simple mapping since data isn't perfectly chronological natively without sorting, but good enough for demo
  }, [issues]);

  const topCategories = React.useMemo(() => {
    const cats = {};
    issues.forEach(i => {
      const c = i.category || 'Other';
      cats[c] = (cats[c] || 0) + 1;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [issues]);

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const uniqueCategories = React.useMemo(() => {
    const cats = new Set(issues.map(i => i.category || 'Other'));
    return ['All', ...Array.from(cats)].sort();
  }, [issues]);

  const filteredIssues = React.useMemo(() => {
    if (filterCategory === 'All') return issues;
    return issues.filter(i => (i.category || 'Other') === filterCategory);
  }, [issues, filterCategory]);

  const loadIssues = React.useCallback(async () => {
    try {
      const list = await fetchAllIssuesApi();
      setIssues(list);
    } catch {
      setIssues(getIssues());
    }
  }, []);

  const loadWorkers = React.useCallback(async () => {
    try {
      const list = await fetchWorkersApi();
      
      const enrichedList = await Promise.all(list.map(async (worker) => {
        try {
          const fbRes = await fetch(`${API_BASE}/api/workers/${worker._id}/feedback`);
          if (fbRes.ok) {
             const fbData = await fbRes.json();
             return { ...worker, averageRating: fbData.averageRating, totalReviews: fbData.totalReviews };
          }
        } catch (e) {
          console.error(e);
        }
        return worker;
      }));

      setWorkers(enrichedList);
    } catch (e) {
      console.error('Failed to load workers', e);
      setWorkers([]);
    }
  }, []);

  React.useEffect(() => {
    loadIssues();
    loadWorkers();
  }, [loadIssues, loadWorkers]);

  function changeStatus(issue, status) {
    const note = { type: 'status', status, at: new Date().toISOString() };
    (async () => {
      try {
        await updateIssueApi({ _id: issue._id || issue.id, status, history: [note] });
        await loadIssues();
        alert('Status updated');
      } catch {
        const updated = { ...issue, status, history: [...(issue.history || []), note] };
        updateIssue(updated);
        await loadIssues();
        alert('Status updated (saved locally)');
      }
    })();
  }

  function addNote(issue, text) {
    const note = { type: 'note', text, at: new Date().toISOString() };
    (async () => {
      try {
        await updateIssueApi({ _id: issue._id || issue.id, history: [note] });
        await loadIssues();
      } catch {
        const updated = { ...issue, history: [...(issue.history || []), note] };
        updateIssue(updated);
        await loadIssues();
      }
    })();
  }

  function assignWorker(issue, workerId) {
    (async () => {
      try {
        await assignIssueApi(issue._id || issue.id, workerId || null);
        await loadIssues();
      } catch (err) {
        console.error('Failed to assign worker', err);
        alert('Failed to assign worker');
      }
    })();
  }

  function deleteIssue(issue) {
    if (!window.confirm('Are you sure you want to permanently delete this issue?')) {
      return;
    }
    (async () => {
      try {
        await deleteIssueApi(issue._id || issue.id);
        await loadIssues();
        alert('Issue deleted');
      } catch (err) {
        console.error('Failed to delete issue from server', err);
        deleteIssueLocal(issue._id || issue.id);
        await loadIssues();
        alert('Issue deleted locally (backend unavailable)');
      }
    })();
  }

  function blockReporter(issue) {
    if (!issue.reporter || !issue.reporter.email) {
      alert('This issue has no reporter email to block.');
      return;
    }
    if (!window.confirm(`Block user ${issue.reporter.email}? They will no longer be able to log in.`)) {
      return;
    }
    (async () => {
      try {
        const res = await blockReporterApi(issue._id || issue.id);
        alert(res.message || 'User blocked');
      } catch (err) {
        console.error('Failed to block user', err);
        alert('Failed to block user (server error)');
      }
    })();
  }

  function downloadHistory(issue) {
    if (!issue) return;
    
    const lines = [];
    lines.push(`--- ISSUE DETAILS ---`);
    lines.push(`Category: ${issue.category || 'N/A'}`);
    lines.push(`Location: ${issue.location || 'N/A'}`);
    lines.push(`Description: ${issue.description || 'N/A'}`);
    lines.push(`Status: ${issue.status || 'N/A'}`);
    lines.push(`Created At: ${new Date(issue.createdAt).toLocaleString()}`);
    lines.push(`Reporter: ${issue.reporter?.name || 'N/A'} (${issue.reporter?.email || 'N/A'})`);
    if (issue.assignedTo) lines.push(`Assigned Worker ID: ${issue.assignedTo}`);
    if (issue.resolutionNote) lines.push(`Resolution Note: ${issue.resolutionNote}`);
    
    lines.push(`\n--- HISTORY LOG ---`);
    if (!issue.history || issue.history.length === 0) {
      lines.push('No history recorded yet.');
    } else {
      issue.history.forEach((h, i) => {
        const text = h.text || h.status || h.note || '';
        const date = h.at ? new Date(h.at).toLocaleString() : 'Unknown Time';
        lines.push(`${i + 1}. [${date}] [${h.type}] ${text}`);
      });
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `issue-${issue._id || issue.id}-history.txt`;
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // --- History View ---
  if (historyIssue) {
    return (
      <div className="admin-page">
        <div className="card" style={{ border: '2px solid #000' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn small outline" onClick={() => setHistoryIssue(null)} style={{ marginRight: 16 }}>
              &larr; Back to Issues
            </button>
            <h3 style={{ margin: 0, marginRight: 'auto' }}>History for: {historyIssue.category}</h3>
            <button className="btn small" onClick={() => downloadHistory(historyIssue)}>
              Download History
            </button>
          </div>
          <div className="issue-meta" style={{ marginBottom: 20 }}>
            <span className="issue-location">{historyIssue.location || 'No location'}</span>
            <span style={{ margin: '0 8px' }}>•</span>
            <span className="issue-date">{new Date(historyIssue.createdAt).toLocaleString()}</span>
          </div>

          <History entries={historyIssue.history} />

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <NoteForm onAdd={text => addNote(historyIssue, text)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="panel-subtitle">View all reported issues, assign them to workers and track resolutions.</p>
        </div>
        <div className="admin-tabs">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'issues' ? 'active' : ''}`}
            onClick={() => setActiveTab('issues')}
          >
            Issues
          </button>
          <button
            type="button"
            className={`tab-pill ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
          >
            Workers
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="admin-dashboard-view">
          
          <section className="dashboard-stats admin-dashboard-stats" aria-label="Global issue statistics">
            <div className="stat-card">
              <div className="stat-label">Total Issues</div>
              <div className="stat-value">{issues.length}</div>
              <div className="stat-icon" aria-hidden="true">📊</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Open</div>
              <div className="stat-value">{issues.filter(i => (i.status || 'Open') === 'Open').length}</div>
              <div className="stat-icon" aria-hidden="true">🟠</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">In Progress</div>
              <div className="stat-value">{issues.filter(i => i.status === 'In Progress').length}</div>
              <div className="stat-icon" aria-hidden="true">🛠️</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Resolved</div>
              <div className="stat-value">{issues.filter(i => i.status === 'Resolved').length}</div>
              <div className="stat-icon" aria-hidden="true">✅</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unassigned issues</div>
              <div className="stat-value">{issues.filter(i => !i.assignedTo && (i.status || 'Open') !== 'Resolved').length}</div>
              <div className="stat-icon" aria-hidden="true">📌</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Resolved today</div>
              <div className="stat-value">{issues.filter(i => i.resolvedAt && String(i.resolvedAt).startsWith(new Date().toISOString().slice(0, 10))).length}</div>
              <div className="stat-icon" aria-hidden="true">📅</div>
            </div>
          </section>

          <section className="admin-dashboard-grid" style={{ marginBottom: 24 }}>
            <div className="card admin-highlight-card">
              <h2 className="admin-highlight-title">Issue operations</h2>
              <p className="admin-highlight-text">
                Review all reported issues, assign them to workers and update their status from a single place.
              </p>
              <div className="admin-highlight-footer">
                <button type="button" onClick={() => setActiveTab('issues')} className="btn small">Open issues console</button>
                <div className="admin-highlight-meta">
                  <span>{new Set(issues.map(i => i.reporter?.email).filter(Boolean)).size} active reporters</span>
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
                    <div className="admin-metric-value">{workers.length}</div>
                  </div>
                  <div>
                    <div className="admin-metric-label">Present today</div>
                    <div className="admin-metric-value">
                      {workers.filter(w => Array.isArray(w.attendance) && w.attendance.some(a => a.date === new Date().toISOString().slice(0, 10) && a.status === 'Present')).length}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveTab('workers')} className="btn small outline">View workers</button>
              </div>
            </div>
          </section>

          <div className="worker-detail-grid">
            <div className="card admin-chart-card">
              <h3 style={{ marginBottom: 16 }}>Issues Over Time</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={issuesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" />
                    <YAxis allowDecimals={false} stroke="var(--text-muted)" />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 8, color: 'var(--text-main)' }} />
                    <Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="card admin-chart-card">
              <h3 style={{ marginBottom: 16 }}>Top Issue Categories</h3>
              <div style={{ height: 300, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={topCategories} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {topCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: 'var(--card-border)', borderRadius: 8, color: 'var(--text-main)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="card admin-issues-card">
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '16px', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>Filter by Category:</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          {filteredIssues.length === 0 && <p>No issues found for this category.</p>}
          {filteredIssues.map(issue => {
            const assigned = workers.find(w => (w._id === issue.assignedTo) || (issue.assignedTo && w._id === String(issue.assignedTo)));
            return (
              <div key={issue._id || issue.id} className="admin-issue-row">
                <div className="admin-issue-main">
                  <div className="issue-title">{issue.category} — <span className="issue-location">{issue.location || 'No location'}</span></div>
                  <div className="issue-description">{issue.description}</div>
                  <div className="issue-meta">
                    <span className={`badge status-${issue.status?.replace(/\s+/g, '-') || 'Open'}`}>{issue.status}</span>
                    <span className="issue-date">{new Date(issue.createdAt).toLocaleString()}</span>
                    {assigned && (
                      <span className="badge worker-badge">Assigned: {assigned.name}</span>
                    )}
                  </div>
                  <div className="admin-issue-extra">
                    <div className="admin-issue-reporter">Reporter: {issue.reporter?.name} ({issue.reporter?.email})</div>
                    {issue.resolutionNote && (
                      <div className="admin-resolution-note">Resolution note: {issue.resolutionNote}</div>
                    )}
                    {issue.proofImageUrl && (
                      <div className="admin-proof">
                        <span>Proof image:</span>
                        <img src={issue.proofImageUrl} alt="Resolved proof" className="admin-proof-img" />
                      </div>
                    )}
                  </div>
                  <div className="admin-actions">
                    <button onClick={() => changeStatus(issue, 'In Progress')}>Mark In Progress</button>
                    <button className="success" onClick={() => changeStatus(issue, 'Resolved')}>Mark Resolved</button>
                    <button className="danger" onClick={() => deleteIssue(issue)}>Delete issue</button>
                    <button className="secondary" onClick={() => blockReporter(issue)}>Block user</button>
                    <button className="secondary" onClick={() => setHistoryIssue(issue)}>View History</button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span className="admin-assign-label">Assign to:</span>
                      <select
                        value={assigned?._id || ''}
                        onChange={e => assignWorker(issue, e.target.value || null)}
                      >
                        <option value="">Unassigned</option>
                        {workers.map(w => (
                          <option key={w._id} value={w._id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* NoteForm and History removed from here */}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'workers' && selectedWorkerDetail && (
        <WorkerDetailView worker={selectedWorkerDetail} onBack={() => setSelectedWorkerDetail(null)} />
      )}

      {activeTab === 'workers' && !selectedWorkerDetail && (
        <div className="card admin-workers-card">
          <h3>Workers</h3>
          {workers.length === 0 && <p>No workers (role = "worker") found. Create them via Signup with role "Maintenance worker".</p>}
          <div className="admin-workers-list">
            {workers.map(worker => {
              const presentCount = Array.isArray(worker.attendance)
                ? worker.attendance.filter(a => a.status === 'Present').length
                : 0;
              const lastEntry = Array.isArray(worker.attendance) && worker.attendance.length > 0
                ? worker.attendance[worker.attendance.length - 1]
                : null;
              return (
                <div key={worker._id} className="admin-worker-card">
                  <div className="admin-worker-header">
                    <div className="avatar-circle">{(worker.name || worker.email || '?')[0].toUpperCase()}</div>
                    <div>
                      <div className="worker-name">{worker.name}</div>
                      <div className="worker-meta">{worker.email}</div>
                      {worker.department && <div className="worker-meta">Dept: {worker.department}</div>}
                    </div>
                  </div>
                  <div className="worker-attendance-meta">
                    <span className="badge worker-attendance-badge">Present days: {presentCount}</span>
                    {worker.averageRating !== undefined && worker.totalReviews > 0 && (
                      <span className="badge" style={{ marginLeft: 8, background: '#ffc107', color: '#000' }}>
                        ⭐ {worker.averageRating} ({worker.totalReviews} reviews)
                      </span>
                    )}
                    {lastEntry && (
                      <span className="worker-last-attendance" style={{ marginLeft: 8 }}>Last: {lastEntry.date} ({lastEntry.status})</span>
                    )}
                  </div>
                  <button className="btn small outline" style={{ marginTop: '12px', width: '100%' }} onClick={() => setSelectedWorkerDetail(worker)}>
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteForm({ onAdd }) {
  const [text, setText] = React.useState('');
  return (
    <div className="admin-note-form">
      <input placeholder="Add note" value={text} onChange={e => setText(e.target.value)} />
      <button onClick={() => { if (text) { onAdd(text); setText(''); } }}>Add</button>
    </div>
  );
}

function History({ entries = [] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div className="admin-history">
      <strong>History</strong>
      <ul>
        {entries.map((h, idx) => (
          <li key={idx}>
            {h.type} - {h.text || h.status || h.note} ({h.at ? new Date(h.at).toLocaleString() : ''})
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkerDetailView({ worker, onBack }) {
  const [feedbacks, setFeedbacks] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [currentDate, setCurrentDate] = React.useState(new Date());

  React.useEffect(() => {
    async function loadFeedback() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/workers/${worker._id || worker.id}/feedback`);
        if (res.ok) {
          const data = await res.json();
          console.log('Loaded feedback:', data);
          setFeedbacks(data.feedbacks || []);
        } else {
          console.error('Failed to load feedback:', res.status);
          setFeedbacks([]);
        }
      } catch (err) {
        console.error('Error loading feedback:', err);
        setFeedbacks([]);
      } finally {
        setLoading(false);
      }
    }
    loadFeedback();
  }, [worker]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const attendanceDates = (worker.attendance || []).filter(a => a.status === 'Present').map(a => a.date);

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
       days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
       const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
       const isPresent = attendanceDates.includes(dateStr);
       days.push(
         <div key={d} className={`calendar-day ${isPresent ? 'present' : ''}`}>
           <span className="day-number">{d}</span>
           {isPresent && <span className="present-dot"></span>}
         </div>
       );
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="card admin-worker-detail-card" style={{ border: '2px solid #000' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <button className="btn small outline" onClick={onBack} style={{ marginRight: 16 }}>
          &larr; Back to Workers
        </button>
        <h3 style={{ margin: 0 }}>Worker Details</h3>
      </div>
      
      <div className="worker-profile-header">
        <div className="avatar-circle large">{(worker.name || worker.email || '?')[0].toUpperCase()}</div>
        <div className="profile-info">
          <h2 style={{ margin: '0 0 4px 0' }}>{worker.name}</h2>
          <div className="worker-meta" style={{ fontSize: '1rem' }}>{worker.email}</div>
          {worker.department && <div className="worker-meta">Department: {worker.department}</div>}
          
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <span className="badge" style={{ background: '#3b82f6', color: '#fff' }}>
              Present Days (Total): {(worker.attendance || []).filter(a => a.status === 'Present').length}
            </span>
            {worker.averageRating !== undefined && worker.totalReviews > 0 && (
              <span className="badge" style={{ background: '#ffc107', color: '#000' }}>
                ⭐ {worker.averageRating} ({worker.totalReviews} reviews)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="worker-detail-grid">
        <div className="worker-calendar-section">
          <h4 style={{ marginBottom: 12 }}>Attendance Calendar</h4>
          <div className="calendar-wrap">
            <div className="calendar-header">
              <button onClick={prevMonth} className="cal-nav-btn">&larr;</button>
              <div className="cal-month-title">{monthNames[month]} {year}</div>
              <button onClick={nextMonth} className="cal-nav-btn">&rarr;</button>
            </div>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="cal-weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {renderCalendarDays()}
            </div>
          </div>
        </div>

        <div className="worker-feedback-section">
          <h4 style={{ marginBottom: 12 }}>User Reviews</h4>
          {loading ? (
            <p style={{ color: 'var(--text-main)' }}>Loading reviews...</p>
          ) : feedbacks.length === 0 ? (
            <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 500 }}>✓ No ratings received yet.</p>
          ) : (
             <div className="feedback-list">
               <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--border-color)' }}>
                 <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                   Overall Rating: <strong style={{ color: '#fbbf24', fontSize: '1.2rem', letterSpacing: '2px' }}>★ {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)}</strong>
                 </p>
                 <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Based on {feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''}</p>
               </div>
               {feedbacks.map((f, i) => (
                 <div key={i} style={{ marginBottom: '12px', padding: '12px', borderLeft: '4px solid #fbbf24', borderRadius: '4px', background: 'rgba(251, 191, 36, 0.05)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                     <strong style={{ color: '#fbbf24', fontSize: '1rem', letterSpacing: '1px' }}>{'★'.repeat(f.rating)}{'☆'.repeat(5-f.rating)}</strong>
                     <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</span>
                   </div>
                   {f.comment && <p style={{ margin: '0 0 8px 0', fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic' }}>"{f.comment}"</p>}
                   <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                     📝 {f.user?.name || f.user?.email || 'Anonymous'}
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

