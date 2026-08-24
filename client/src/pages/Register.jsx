import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function messageFor(error) {
  if (error?.body?.error === "email_taken") {
    return "Υπάρχει ήδη λογαριασμός με αυτό το email.";
  }

  if (error?.body?.error === "validation_error") {
    const first = error.body.details?.[0];

    return first?.message ?? "Έλεγξε τα στοιχεία που έδωσες.";
  }

  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);
    setBusy(true);

    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <h1>Εγγραφή</h1>

      <form onSubmit={handleSubmit}>
        <label>
          Όνομα
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>

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
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Δημιουργία..." : "Δημιουργία λογαριασμού"}
        </button>
      </form>

      <p>
        Έχεις ήδη λογαριασμό; <Link to="/login">Σύνδεση</Link>
      </p>
    </div>
  );
}
