import React from 'react';

import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import Signup from './components/Signup';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import WorkerPanel from './components/WorkerPanel';
import Home from './components/Home';
import { getCurrentUser, logout } from './utils/storage';

function App() {
  const [user, setUser] = React.useState(getCurrentUser());

  React.useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  function handleLogout() {
    logout();
    setUser(null);
  }

  return (
    <BrowserRouter>
    <div className="App">
        <header className="topbar">
          <div className="brand">
            <img src="/logo192.png" alt="logo" className="brand-logo" />
            <div className="brand-title">
              <div className="brand-main">COLLEGE FIX</div>
              <div className="brand-sub">Campus Issue Tracker</div>
            </div>
          </div>
          <div className="top-actions">
            {!user && <Link to="/login" className="btn small">Login</Link>}
            {!user && <Link to="/signup" className="btn small outline">Register</Link>}
            {user && <Link to="/dashboard" className="top-link">Dashboard</Link>}
            {user && user.role === 'admin' && <Link to="/admin" className="top-link">Admin</Link>}
            {user && user.role === 'worker' && <Link to="/worker" className="top-link">Worker</Link>}
            {user && <button onClick={handleLogout} className="btn small">Logout</button>}
          </div>
      </header>

        <main className="page-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signup" element={<Signup onAuth={() => setUser(getCurrentUser())} />} />
            <Route path="/login" element={<Login onAuth={() => setUser(getCurrentUser())} />} />
            <Route path="/dashboard" element={
              user ? <Dashboard user={user} /> : <Navigate to="/login" replace />
            } />
            <Route path="/admin" element={
              user && user.role === 'admin' ? <AdminPanel /> : <Navigate to="/login" replace />
            } />
            <Route path="/worker" element={
              user && user.role === 'worker' ? <WorkerPanel /> : <Navigate to="/login" replace />
            } />
          </Routes>
        </main>
    </div>
    </BrowserRouter>
  );
}

export default App;
