import React from 'react';
import { saveIssue, getCurrentUser } from '../utils/storage';

async function createIssueApi(issue) {
  // Call backend and surface status/message so caller can decide about fallbacks
  try {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(issue)
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = (data && data.message) ? data.message : `Failed to create issue (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (err) {
    // Re-throw so the caller can decide whether to save locally or show an error
    throw err;
  }
}

const CATEGORIES = ['Fan', 'Computer', 'Benches', 'Water', 'Cleanliness', 'Canteen', 'Other'];

export default function IssueForm({ onCreated }) {
  const user = getCurrentUser();
  const [category, setCategory] = React.useState(CATEGORIES[0]);
  const [location, setLocation] = React.useState('');
  const [description, setDescription] = React.useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!description) {
      alert('Describe the issue');
      return;
    }
    const issue = {
      id: `iss_${Date.now()}`,
      category,
      location,
      description,
      status: 'Open',
      createdAt: new Date().toISOString(),
      reporter: { email: user.email, name: user.name, role: user.role },
      history: [],
    };
    // try backend first
    (async () => {
      try {
        await createIssueApi({
          category: issue.category,
          location: issue.location,
          description: issue.description,
          reporter: issue.reporter
        });
        if (onCreated) onCreated();
        alert('Issue submitted');
      } catch (err) {
        console.error('Failed to submit issue to backend', err);
        // Only fall back to local storage when backend is unreachable (network error, no HTTP status)
        if (!err.status) {
          saveIssue(issue);
          if (onCreated) onCreated();
          alert('Issue submitted (saved locally - backend unavailable)');
        } else {
          // Backend responded with an error status; show that instead of claiming backend is down
          alert(err.message || 'Failed to submit issue to server');
        }
      }
    })();
    setDescription('');
    setLocation('');
  }

  return (
    <div className="card report-card">
      <h3 className="panel-title">Report New Issue</h3>
      <p className="panel-subtitle">Fill in the details below to submit a new campus facility issue.</p>
      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-row">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="E.g. CSE Lab 2, 3rd floor" />
        </div>
        <div className="form-row">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Describe the issue in detail" />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn primary">Submit Issue</button>
        </div>
      </form>
    </div>
  );
}

