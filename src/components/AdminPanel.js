import React, { useEffect, useState } from "react";
import { getIssues, updateIssue } from '../utils/storage';

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

export default function AdminPanel() {
  const [issues, setIssues] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('issues'); // 'issues' | 'workers'
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    loadIssues();
    loadWorkers();
  }, [loadIssues, loadWorkers]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      alert("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

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

  async function toggleBlock(user) {
    const id = user._id || user.id;
    const willBlock = !user.blocked;
    const action = willBlock ? "block" : "unblock";

    if (!window.confirm(`Are you sure you want to ${action} ${user.name || user.email}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Server error");
      }
      // update local state
      setUsers((prev) => prev.map((u) => (u._id === id || u.id === id ? { ...u, blocked: willBlock } : u)));
    } catch (err) {
      console.error(err);
      alert("Failed to update user status.");
    }
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
                  <NoteForm onAdd={text => addNote(issue, text)} />
                  <History entries={issue.history} />
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

      <div className="admin-users-card">
        <h3>Users</h3>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan="5">No users found.</td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user._id || user.id}>
                  <td>{user.name || "—"}</td>
                  <td>{user.email || "—"}</td>
                  <td>{user.role || "user"}</td>
                  <td>{user.blocked ? "Blocked" : "Active"}</td>
                  <td>
                    <button onClick={() => toggleBlock(user)}>
                      {user.blocked ? "Unblock" : "Block"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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

