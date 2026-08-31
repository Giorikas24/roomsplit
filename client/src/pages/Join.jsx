import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";

export default function Join() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Πρώτα προεπισκόπηση, ώστε ο χρήστης να δει πού μπαίνει
    // πριν αποφασίσει. Δεν τον βάζουμε αυτόματα, γιατί ένας
    // σύνδεσμος μπορεί να προωθήθηκε κατά λάθος.
    apiFetch(`/api/groups/join/${token}`)
      .then((data) => setGroup(data.group))
      .catch(() =>
        setError("Αυτός ο σύνδεσμος έχει χρησιμοποιηθεί ή έχει λήξει.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  async function accept() {
    setBusy(true);

    try {
      const data = await apiFetch(`/api/groups/join/${token}`, {
        method: "POST",
      });

      navigate(`/groups/${data.group.id}`, { replace: true });
    } catch (err) {
      setError(
        err.body?.error === "already_member"
          ? "Είσαι ήδη μέλος σε αυτό το σπίτι."
          : "Αυτός ο σύνδεσμος δεν ισχύει πλέον."
      );
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="auth-page">
        <p className="muted">Φόρτωση...</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <p className="auth-brand">Roomsplit</p>

      <div className="auth-card">
        {error ? (
          <>
            <h1>Δεν έγινε</h1>
            <p className="muted">{error}</p>

            <button
              type="button"
              className="secondary"
              onClick={() => navigate("/")}
              style={{ marginTop: "1rem" }}
            >
              Στα σπίτια μου
            </button>
          </>
        ) : (
          <>
            <p className="hero-label">Πρόσκληση σε</p>
            <h1>{group.name}</h1>

            <p className="muted" style={{ marginBottom: "1.25rem" }}>
              Μπαίνοντας, θα βλέπεις τα έξοδα και τα υπόλοιπα του σπιτιού.
            </p>

            <button type="button" onClick={accept} disabled={busy}>
              {busy ? "Είσοδος..." : "Μπες στο σπίτι"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}