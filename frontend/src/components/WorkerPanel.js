import React from 'react';
import { getCurrentUser } from '../utils/storage';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '/';

async function fetchAllIssues() {
  const res = await fetch(`${API_BASE}/api/issues`);
  if (!res.ok) throw new Error('failed to fetch issues');
  return await res.json();
}

async function fetchWorkerFeedback(workerId) {
  const res = await fetch(`${API_BASE}/api/workers/${workerId}/feedback`);
  if (!res.ok) throw new Error('failed to fetch feedback');
  return await res.json();
}

async function fetchWorker(workerId) {
  const res = await fetch(`${API_BASE}/api/workers/${workerId}`);
  if (!res.ok) throw new Error('failed to fetch worker');
  return await res.json();
}

async function markAttendance(workerId) {
  const res = await fetch(`${API_BASE}/api/workers/${workerId}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!res.ok) throw new Error('failed to mark attendance');
  return await res.json();
}

async function resolveIssueWithProof(issueId, { workerId, note, file }) {
  const formData = new FormData();
  formData.append('workerId', workerId);
  if (note) formData.append('resolutionNote', note);
  if (file) formData.append('proofImage', file);

  const res = await fetch(`${API_BASE}/api/issues/${issueId}/resolve`, {
    method: 'PUT',
    body: formData,
  });
  if (!res.ok) throw new Error('failed to resolve issue');
  return await res.json();
}

export default function WorkerPanel() {
  const user = getCurrentUser();
  const [issues, setIssues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [attLoading, setAttLoading] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [noteByIssue, setNoteByIssue] = React.useState({});
  const [fileByIssue, setFileByIssue] = React.useState({});
  const [workerDoc, setWorkerDoc] = React.useState(null);
  const [feedbackData, setFeedbackData] = React.useState({ feedbacks: [], averageRating: 0, totalReviews: 0 });
  const [filterCategory, setFilterCategory] = React.useState('All');

  const isWorker = user && user.role === 'worker';

  const workerId = user && (user.id || user._id);

  const loadWorker = React.useCallback(async () => {
    if (!isWorker || !workerId) return;
    try {
      const w = await fetchWorker(workerId);
      setWorkerDoc(w);
    } catch (err) {
      console.error(err);
    }
  }, [isWorker, workerId]);

  const loadIssues = React.useCallback(async () => {
    if (!isWorker) return;
    if (!workerId) {
      setMessage('No worker id from backend. Please log out and log in again when backend is running.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Show all reported issues so any worker can see and resolve them
      const list = await fetchAllIssues();
      setIssues(list);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load issues from server.');
    } finally {
      setLoading(false);
    }
  }, [isWorker, workerId]);

  const loadFeedback = React.useCallback(async () => {
    if (!isWorker || !workerId) return;
    try {
      const data = await fetchWorkerFeedback(workerId);
      setFeedbackData(data);
    } catch (err) {
      console.error(err);
    }
  }, [isWorker, workerId]);

  React.useEffect(() => {
    loadWorker();
    loadIssues();
    loadFeedback();
  }, [loadWorker, loadIssues, loadFeedback]);

  const today = new Date().toISOString().slice(0, 10);
  const attendance = Array.isArray(workerDoc?.attendance) ? workerDoc.attendance : [];
  const hasMarkedToday = attendance.some(a => a.date === today && a.status === 'Present');

  // Dashboard-style quick stats based on issues assigned to this worker (or all if unassigned)
  const myIssues = issues.filter(i =>
    i.assignedTo && (String(i.assignedTo) === String(workerId))
  );
  const myOpen = myIssues.filter(i => (i.status || 'Open') === 'Open').length;
  const myInProgress = myIssues.filter(i => i.status === 'In Progress').length;
  const myResolved = myIssues.filter(i => i.status === 'Resolved').length;

  if (!isWorker) {
    return (
      <div className="card">
        <h3>Worker Panel</h3>
        <p>You must be logged in as a worker to view this page.</p>
      </div>
    );
  }

  if (!workerId) {
    return (
      <div className="card">
        <h3>Worker Panel</h3>
        <p>
          You are logged in as a worker created locally without backend id.
          Please log out and sign in again (with backend running) so your account is saved in the database.
        </p>
      </div>
    );
  }

  const handleAttendance = async () => {
    try {
      setAttLoading(true);
      await markAttendance(workerId);
      await loadWorker();
      setMessage('Attendance marked for today.');
    } catch (err) {
      console.error(err);
      setMessage('Failed to mark attendance.');
    } finally {
      setAttLoading(false);
    }
  };

  const handleResolve = async (issue) => {
    try {
      const note = noteByIssue[issue._id || issue.id] || '';
      const file = fileByIssue[issue._id || issue.id];
      await resolveIssueWithProof(issue._id || issue.id, {
        workerId,
        note,
        file,
      });
      setMessage('Issue marked as resolved.');
      setNoteByIssue(prev => ({ ...prev, [issue._id || issue.id]: '' }));
      setFileByIssue(prev => ({ ...prev, [issue._id || issue.id]: null }));
      await loadIssues();
    } catch (err) {
      console.error(err);
      setMessage('Failed to resolve issue.');
    }
  };

  return (
    <div className="worker-page">
      <div className="worker-header">
        <div>
          <h2>Maintenance dashboard</h2>
          <p className="panel-subtitle">See your assigned work, mark attendance and close issues with proof.</p>
        </div>
        <div className="worker-header-meta">
          <div className="avatar-circle">{(user.name || user.email || '?')[0].toUpperCase()}</div>
          <div className="worker-header-text">
            <div className="worker-name">{user.name}</div>
            <div className="worker-meta">{user.email}</div>
          </div>
        </div>
      </div>

      <section className="worker-top-dashboard">
        <div className="worker-top-actions">
          <button type="button" className="btn small" onClick={handleAttendance} disabled={attLoading || hasMarkedToday}>
            {hasMarkedToday ? 'Present (today)' : attLoading ? 'Marking attendance...' : 'Mark Present Today'}
          </button>
          <button type="button" className="btn small outline" onClick={loadIssues} disabled={loading}>
            Refresh Issues
          </button>
        </div>

        <div className="worker-kpi-row">
          <div className="stat-card">
            <div className="stat-label">My open issues</div>
            <div className="stat-value">{myOpen}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">In progress</div>
            <div className="stat-value">{myInProgress}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved by me</div>
            <div className="stat-value">{myResolved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Worker Rating</div>
            <div className="stat-value">{feedbackData.averageRating || 'N/A'} ⭐</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>{feedbackData.totalReviews} reviews</div>
          </div>
        </div>

        <div className="card worker-attendance-card">
          <h3 className="panel-title">Your attendance</h3>
          {attendance.length === 0 && <p className="worker-message">No attendance recorded yet. Mark yourself present to start tracking.</p>}
          {attendance.length > 0 && (
            <table className="worker-attendance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance
                  .slice()
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .slice(0, 10)
                  .map((row, idx) => (
                    <tr key={idx} className={row.date === today ? 'worker-att-today' : ''}>
                      <td>{row.date}</td>
                      <td>{row.status}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card worker-attendance-card" style={{ marginTop: '1.5rem' }}>
          <h3 className="panel-title">Your Feedback & Ratings</h3>
          {feedbackData.feedbacks.length === 0 && <p className="worker-message">No ratings received yet.</p>}
          {feedbackData.feedbacks.length > 0 && (
            <div className="worker-issues-list">
              {feedbackData.feedbacks.map((f, i) => (
                <div key={i} className="worker-issue-row" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{f.rating} / 5 Stars</strong>
                    <span className="issue-date">{new Date(f.createdAt).toLocaleDateString()}</span>
                  </div>
                  {f.comment && <p style={{ margin: 0, fontStyle: 'italic', marginBottom: '8px' }}>"{f.comment}"</p>}
                  <div style={{ fontSize: '13px', color: 'var(--text-color)', opacity: 0.7 }}>
                    - {f.user?.name || f.user?.email || 'Anonymous Student'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {message && <div className="worker-message">{message}</div>}

      <div className="card worker-issues-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="panel-title" style={{ margin: 0 }}>Reported Issues</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: 600 }}>Filter by Category:</label>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
            >
              {['All', ...Array.from(new Set(issues.map(i => i.category || 'Other'))).sort()].map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {!loading && issues.filter(i => filterCategory === 'All' || (i.category || 'Other') === filterCategory).length === 0 && <p>No issues found for this category.</p>}

        {!loading && issues.filter(i => filterCategory === 'All' || (i.category || 'Other') === filterCategory).length > 0 && (
          <div className="worker-issues-list">
            {issues.filter(i => filterCategory === 'All' || (i.category || 'Other') === filterCategory).map(issue => {
              const key = issue._id || issue.id;
              return (
                <div key={key} className="worker-issue-row">
                  <div className="worker-issue-main">
                    <div className="issue-title">{issue.category} — <span className="issue-location">{issue.location || 'No location'}</span></div>
                    <div className="issue-description">{issue.description}</div>
                    <div className="issue-meta">
                      <span className={`badge status-${issue.status?.replace(/\s+/g, '-') || 'Open'}`}>{issue.status}</span>
                      <span className="issue-date">{new Date(issue.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="worker-issue-reporter">Reporter: {issue.reporter?.name} ({issue.reporter?.email})</div>
                    {issue.proofImageUrl && (
                      <div className="admin-proof">
                        <span>Existing proof image:</span>
                        <img src={issue.proofImageUrl} alt="Resolved proof" className="admin-proof-img" />
                      </div>
                    )}
                  </div>
                  <div className="worker-issue-actions">
                    <label>
                      Resolution note
                      <textarea
                        rows={2}
                        value={noteByIssue[key] || ''}
                        onChange={e => setNoteByIssue(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                    </label>
                    <label className="worker-file-label">
                      Proof image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files && e.target.files[0];
                          setFileByIssue(prev => ({ ...prev, [key]: file || null }));
                        }}
                      />
                    </label>
                    <button type="button" className="btn small" onClick={() => handleResolve(issue)}>
                      Mark as Resolved
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
