import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function extractErrorMessage(err, fallback) {
  const detail = err.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || "Invalid input").join(", ");
  }
  return fallback;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(extractErrorMessage(err, "Login failed"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button className="primary" type="submit">Login</button>
      <p className="muted">No account? <Link to="/signup">Sign up</Link></p>
    </form>
  );
}