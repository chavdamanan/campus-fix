import React from 'react';
import { getIssues, updateIssue, getCurrentUser } from '../utils/storage';

const API_BASE = process.env.REACT_APP_API_BASE_URL || '/';

async function fetchIssuesApi(email) {
  const url = email ? `${API_BASE}/api/issues?reporterEmail=${encodeURIComponent(email)}` : `${API_BASE}/api/issues`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('failed to fetch');
  return await res.json();
}

async function updateIssueApi(issue) {
  const res = await fetch(`${API_BASE}/api/issues/${issue._id || issue.id}`, {
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
              
              {!issue.feedbackSubmitted && issue.status === 'Resolved' && issue.assignedTo ? (
                <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.03)', padding: '10px', borderRadius: '8px' }}>
                  <RateWorkerForm issue={issue} onRated={() => { refresh(); setTimeout(refresh, 1000); }} />
                </div>
              ) : (
                <FeedbackForm onSend={text => addFeedback(issue, text)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RateWorkerForm({ issue, onRated }) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const user = getCurrentUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        issueId: issue._id || issue.id,
        workerId: issue.assignedTo,
        rating,
        comment,
        user: { name: user?.name, email: user?.email }
      };
      console.log('Submitting feedback payload:', payload);
      console.log('Using API base:', API_BASE);
      
      const res = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', res.status);
      const textData = await res.text();
      console.log('Response text:', textData);
      
      if (!res.ok) {
        let errData;
        try {
          errData = JSON.parse(textData);
        } catch {
          errData = null;
        }
        const errorMsg = (errData && errData.message) ? errData.message : `HTTP ${res.status}: Failed to submit feedback`;
        console.error('Feedback submission failed:', errorMsg);
        
        // If feedback already submitted, refresh to update status
        if (errorMsg.includes('already submitted')) {
          alert('Feedback was already submitted for this issue (from another session). Refreshing...');
          onRated();
          return;
        }
        
        throw new Error(errorMsg);
      }
      
      console.log('Feedback submitted successfully');
      alert('Thank you for rating the worker!');
      
      // Refresh immediately and again after delay to ensure update
      onRated();
      setTimeout(onRated, 1000);
    } catch (err) {
      console.error('Feedback submission error details:', err);
      alert(`Error submitting feedback: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="worker-feedback-form" onSubmit={handleSubmit}>
      <div style={{ marginBottom: 5, fontSize: '14px' }}><strong>Rate the worker's resolution:</strong></div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="feedback-input" style={{ width: 'auto' }}>
          <option value={5}>5 - Excellent</option>
          <option value={4}>4 - Good</option>
          <option value={3}>3 - Average</option>
          <option value={2}>2 - Poor</option>
          <option value={1}>1 - Very Poor</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input 
          className="feedback-input" 
          placeholder="Any comments? (optional)" 
          value={comment} 
          onChange={(e) => setComment(e.target.value)} 
        />
        <button type="submit" className="btn small" disabled={loading} style={{ background: '#28a745', borderColor: '#28a745' }}>
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>
      </div>
    </form>
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

