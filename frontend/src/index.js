import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const RENDER_API = 'https://campus-fix.onrender.com';
const LOCAL_API = 'http://localhost:5000';

async function checkHealth(url, timeout = 3000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const res = await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch (e) {
    return false;
  }
}

// Determine API base: try Render first, then localhost, then fallback to empty (use relative URLs)
async function resolveApiBase() {
  if (await checkHealth(RENDER_API)) return RENDER_API;
  if (await checkHealth(LOCAL_API)) return LOCAL_API;
  return '';
}

function patchFetchWithBase(base) {
  const originalFetch = window.fetch.bind(window);
  window.__API_BASE__ = base || '';
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string') {
        // Only rewrite calls that target our API root (start with /api)
        if (input.startsWith('/api')) {
          if (window.__API_BASE__) {
            input = window.__API_BASE__.replace(/\/$/, '') + input;
          }
        }
      } else if (input && input.url && typeof input.url === 'string') {
        if (input.url.startsWith('/api') && window.__API_BASE__) {
          input = new Request(window.__API_BASE__.replace(/\/$/, '') + input.url, input);
        }
      }
    } catch (e) {
      // ignore and fall back to original fetch behavior
    }
    return originalFetch(input, init);
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));

resolveApiBase().then(base => {
  patchFetchWithBase(base);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}).catch(() => {
  // If resolution fails, still render and use relative URLs
  patchFetchWithBase('');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
