import React from 'react';
import { getIssues, updateIssue, getCurrentUser } from '../utils/storage';

async function fetchIssuesApi(email) {
  const url = email ? `/api/issues?reporterEmail=${encodeURIComponent(email)}` : '/api/issues';
  const res = await fetch(url);
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

export default function IssueList({ refreshKey = 0 }) {
  const user = getCurrentUser();
  const [issues, setIssues] = React.useState([]);

  React.useEffect(() => {
    (async () => {
      try {
        const list = await fetchIssuesApi(user.email);
        setIssues(list);
      } catch {
        setIssues(getIssues().filter(i => i.reporter.email === user.email));
      }
    })();
  }, [user.email, refreshKey]);

  function refresh() {
    (async () => {
      try {
        const list = await fetchIssuesApi(user.email);
        setIssues(list);
      } catch {
        setIssues(getIssues().filter(i => i.reporter.email === user.email));
      }
    })();
  }

  function addFeedback(issue, feedback) {
    const updated = { ...issue, history: [...(issue.history || []), { type: 'feedback', text: feedback, at: new Date().toISOString() }] };
    (async () => {
      try {
        await updateIssueApi({ _id: issue._id, history: [{ type: 'feedback', text: feedback, at: new Date().toISOString() }] });
        refresh();
      } catch {
        updateIssue(updated);
        refresh();
      }
    })();
  }

  const hasIssues = issues && issues.length > 0;

  return (
    <div className="card issues-card">
      <div className="issues-header">
        <h3 className="panel-title">Recent Issues</h3>
        {hasIssues && <span className="issues-count">{issues.length} total</span>}
      </div>

      {!hasIssues && (
        <div className="recent-issues-empty">
          <div className="empty-icon" aria-hidden="true">!</div>
          <div className="empty-title">No issues reported yet</div>
          <div className="empty-text">Report your first campus facility issue to get started.</div>
        </div>
      )}

      {hasIssues && (
        <div className="issues-list">
          {issues.map(issue => (
            <div key={issue._id || issue.id} className="issue-row">
              <div className="issue-main">
                <div className="issue-title">{issue.category} — <span className="issue-location">{issue.location || 'No location'}</span></div>
                <div className="issue-description">{issue.description}</div>
                <div className="issue-meta">
                  <span className={`badge status-${issue.status?.replace(/\s+/g, '-') || 'Open'}`}>{issue.status}</span>
                  <span className="issue-date">{new Date(issue.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <FeedbackForm onSend={text => addFeedback(issue, text)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackForm({ onSend }) {
  const [text, setText] = React.useState('');
  return (
    <div className="feedback-form-inline">
      <input
        className="feedback-input"
        placeholder="Add a quick comment or update"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button
        type="button"
        className="btn small"
        onClick={() => {
          if (text.trim()) {
            onSend(text.trim());
            setText('');
          }
        }}
      >
        Send
      </button>
    </div>
  );}

