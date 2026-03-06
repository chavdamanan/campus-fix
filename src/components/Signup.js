import React from "react";
import '../App.css'; // ensure styles are loaded
import { useNavigate } from "react-router-dom";
import { setCurrentUser, saveUser } from "../utils/storage";

export default function Signup(props) {
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("student");
  const [mobile, setMobile] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      alert("Please enter name, email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, mobile, role, department }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        if (props.onAuth) props.onAuth();
        navigate("/dashboard");
      } else if (res.status === 409) {
        alert("User already exists — try logging in");
      } else {
        const body = await res.json();
        alert(body.message || "Registration failed");
      }
    } catch (err) {
      console.error(err);
      // fallback to local save for demo
      const ok = saveUser({ name, email, role, mobile, department });
      if (ok) {
        setCurrentUser({ name, email, role, mobile, department });
        if (props.onAuth) props.onAuth();
        navigate("/dashboard");
      } else {
        alert("Registration failed (backend unreachable and user exists locally)");
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
          <div className="brand-logo-large" style={{ width: 56, height: 56, margin: "auto" }} />
          <h2 style={{ marginTop: 8 }}>Create Account</h2>
          <div style={{ color: "var(--muted)", marginBottom: 18 }}>Sign up to report campus facility issues</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>

          <div>
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="staff">Non-teaching staff</option>
              <option value="worker">Maintenance worker</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Phone (optional)</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="1234567890" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Department</label>
              <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="CSE, ECE..." />
            </div>
          </div>

          <div>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>

          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" />
          </div>

          <div style={{ marginTop: 14, textAlign: "center" }}>
            <button type="submit" className="btn large" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}


