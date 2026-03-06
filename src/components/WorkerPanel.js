import React from 'react';
import { getCurrentUser } from '../utils/storage';

async function fetchAllIssues() {
  const res = await fetch('/api/issues');
  if (!res.ok) throw new Error('failed to fetch issues');
  return await res.json();
}

async function markAttendance(workerId) {
  const res = await fetch(`/api/workers/${workerId}/attendance`, {
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

  const res = await fetch(`/api/issues/${issueId}/resolve`, {
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

  const isWorker = user && user.role === 'worker';

  const workerId = user && (user.id || user._id);

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

  React.useEffect(() => {
    loadIssues();
  }, [loadIssues]);

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
          <h2>Worker Panel</h2>
          <p className="panel-subtitle">View all reported issues, update their status and upload proof of resolution.</p>
        </div>
        <div className="worker-header-meta">
          <div className="avatar-circle">{(user.name || user.email || '?')[0].toUpperCase()}</div>
          <div className="worker-header-text">
            <div className="worker-name">{user.name}</div>
            <div className="worker-meta">{user.email}</div>
          </div>
        </div>
      </div>

      <div className="worker-top-actions">
        <button type="button" className="btn small" onClick={handleAttendance} disabled={attLoading}>
          {attLoading ? 'Marking attendance...' : 'Mark Present Today'}
        </button>
        <button type="button" className="btn small outline" onClick={loadIssues} disabled={loading}>
          Refresh Issues
        </button>
      </div>

      {message && <div className="worker-message">{message}</div>}

      <div className="card worker-issues-card">
        <h3 className="panel-title">Reported Issues</h3>
        {loading && <p>Loading...</p>}
        {!loading && issues.length === 0 && <p>No issues reported yet.</p>}

        {!loading && issues.length > 0 && (
          <div className="worker-issues-list">
            {issues.map(issue => {
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
