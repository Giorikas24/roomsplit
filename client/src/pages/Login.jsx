import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Μεταφράζει τους κωδικούς σφάλματος του server σε
// μηνύματα για τον χρήστη. Ο server στέλνει σταθερά
// αναγνωριστικά, η μετάφραση ανήκει στον client.
function messageFor(error) {
  if (error?.body?.error === "invalid_credentials") {
    return "Λάθος email ή κωδικός.";
  }

  if (error?.body?.error === "validation_error") {
    return "Έλεγξε τα στοιχεία που έδωσες.";
  }

  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  // Κλειδώνει το κουμπί όσο τρέχει το αίτημα, ώστε να μη
  // σταλεί δύο φορές με διπλό κλικ.
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    // Χωρίς αυτό, ο browser θα έκανε πλήρη επαναφόρτωση
    // της σελίδας και θα χανόταν η κατάσταση του React.
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

      <p>
        Δεν έχεις λογαριασμό; <Link to="/register">Εγγραφή</Link>
      </p>
    </div>
  );
}
