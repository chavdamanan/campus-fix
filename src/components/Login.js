import React from "react";
import '../App.css'; // ensure styles are loaded
import { useNavigate } from "react-router-dom";
import { setCurrentUser, getUsers } from "../utils/storage";

export default function Login(props) {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        if (props.onAuth) props.onAuth();
        navigate("/dashboard");
        return;
      }
      const body = await response.json();
      alert(body.message || "Login failed");
    } catch (err) {
      console.error("Login error:", err);
      // fallback: try local storage users (demo only)
      const users = getUsers();
      const localUser = users.find((u) => u.email === email);
      if (localUser) {
        setCurrentUser(localUser);
        if (props.onAuth) props.onAuth();
        navigate("/dashboard");
      } else {
        alert("Login failed (backend unreachable)");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-avatar" />
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div
            className="brand-logo-large"
            style={{ width: 56, height: 56, margin: "auto" }}
          />
          <h2 style={{ marginTop: 8 }}>Welcome Back</h2>
          <div style={{ color: "var(--muted)", marginBottom: 18 }}>
            Sign in to continue to Campus Fix
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button
              type="submit"
              className="btn large"
              disabled={loading}
            >{loading ? 'Signing in...' : 'Sign In'}</button>
          </div>
        </form>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          Don't have an account? <a href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  );
}


