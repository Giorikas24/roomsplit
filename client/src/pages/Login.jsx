import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function messageFor(error) {
  if (error?.body?.error === "invalid_credentials") {
    return "Το email ή ο κωδικός δεν ταιριάζουν.";
  }

  if (error?.body?.error === "validation_error") {
    return "Συμπλήρωσε σωστά το email και τον κωδικό.";
  }

  return "Η σύνδεση δεν ολοκληρώθηκε. Δοκίμασε ξανά.";
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);
    setBusy(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <p className="auth-brand">Roomsplit</p>

      <div className="auth-card">
        <h1>Σύνδεση</h1>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Κωδικός
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Σύνδεση..." : "Σύνδεση"}
          </button>
        </form>
      </div>

      <p className="auth-foot">
        Δεν έχεις λογαριασμό; <Link to="/register">Φτιάξε έναν</Link>
      </p>
    </div>
  );
}