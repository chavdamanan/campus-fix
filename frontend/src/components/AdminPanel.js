import React from 'react';
import { getIssues, updateIssue, deleteIssueLocal } from '../utils/storage';

async function fetchAllIssuesApi() {
  const res = await fetch('/api/issues');
  if (!res.ok) throw new Error('failed to fetch');
  return await res.json();
}

async function updateIssueApi(issue) {
  const res = await fetch(`/api/issues/${issue._id || issue.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(issue)
  });
  if (!res.ok) throw new Error('failed to update issue');
  return await res.json();
}

async function fetchWorkersApi() {
  const res = await fetch('/api/workers');
  if (!res.ok) throw new Error('failed to fetch workers');
  return await res.json();
}

async function assignIssueApi(id, workerId) {
  const res = await fetch(`/api/issues/${id}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerId })
  });
  if (!res.ok) throw new Error('failed to assign issue');
  return await res.json();
}

async function deleteIssueApi(id) {
  const res = await fetch(`/api/issues/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('failed to delete issue');
  return await res.json();
}

async function blockReporterApi(id) {
  const res = await fetch(`/api/issues/${id}/block-reporter`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('failed to block user');
  return await res.json();
}

export default function AdminPanel() {
  const [issues, setIssues] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('issues'); // 'issues' | 'workers'
  const [historyIssue, setHistoryIssue] = React.useState(null);

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
      setWorkers(list);
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

  // --- History View ---
  if (historyIssue) {
    return (
      <div className="admin-page">
        <div className="card" style={{ border: '2px solid #000' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn small outline" onClick={() => setHistoryIssue(null)} style={{ marginRight: 16 }}>
              &larr; Back to Issues
            </button>
            <h3>History for: {historyIssue.category}</h3>
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

      {activeTab === 'issues' && (
        <div className="card admin-issues-card">
          {issues.length === 0 && <p>No issues reported.</p>}
          {issues.map(issue => {
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

      {activeTab === 'workers' && (
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
                    {lastEntry && (
                      <span className="worker-last-attendance">Last: {lastEntry.date} ({lastEntry.status})</span>
                    )}
                  </div>
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

