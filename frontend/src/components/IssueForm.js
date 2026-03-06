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

const CATEGORY_ICONS = [
  { label: 'Fan', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a5 5 0 100-10 5 5 0 000 10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 12c4 0 7 3 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 12c0 4-3 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { label: 'Computer', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M8 20h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
  { label: 'Benches', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="20" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" /><path d="M6 20v-6" stroke="currentColor" strokeWidth="1.5" /><path d="M18 20v-6" stroke="currentColor" strokeWidth="1.5" /></svg>) },
  { label: 'Water', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2s5 5 5 9a5 5 0 11-10 0c0-4 5-9 5-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { label: 'Cleanliness', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l1.5 3L17 8l-3 1-1.5 3L11 9 8 8l3.5-2L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>) },
  { label: 'Canteen', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16v6a4 4 0 01-4 4H8a4 4 0 01-4-4V7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M16 3v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>) },
  { label: 'Other', svg: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>) }
];

const CATEGORIES = CATEGORY_ICONS.map(c => c.label);

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
          <div className="category-grid">
            {CATEGORY_ICONS.map((cat) => (
              <div
                key={cat.label}
                className={`category-tile ${category === cat.label ? 'selected' : ''}`}
                onClick={() => setCategory(cat.label)}
                type="button"
              >
                <div className="category-icon">{cat.svg}</div>
                <div className="category-label">{cat.label}</div>
              </div>
            ))}
          </div>
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

