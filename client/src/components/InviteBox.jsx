import { useState } from "react";
import { apiFetch } from "../lib/api.js";

export default function InviteBox({ groupId }) {
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function createInvite() {
    setBusy(true);
    setError(null);
    setCopied(false);

    try {
      const data = await apiFetch(`/api/groups/${groupId}/invites`, {
        method: "POST",
      });

      // Το window.location.origin δίνει το πρωτόκολλο και τη
      // διεύθυνση της τρέχουσας σελίδας, οπότε ο σύνδεσμος
      // δουλεύει και τοπικά και μετά το deploy χωρίς αλλαγή.
      setLink(`${window.location.origin}/join/${data.invite.token}`);
    } catch {
      setError("Ο σύνδεσμος δεν δημιουργήθηκε. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);

      // Το μήνυμα επιβεβαίωσης σβήνει μόνο του. Αν έμενε,
      // θα έλεγε "Αντιγράφηκε" ακόμα και δέκα λεπτά μετά.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Η αντιγραφή δεν έγινε. Επίλεξε τον σύνδεσμο και αντίγραψέ τον.");
    }
  }

  return (
    <div className="panel" style={{ marginBottom: "0.7rem" }}>
      <div className="row">
        <strong>Πρόσκληση συγκατοίκου</strong>
      </div>

      <p className="muted" style={{ margin: "0.3rem 0 0.9rem" }}>
        Στείλε τον σύνδεσμο σε όποιον θέλεις να μπει στο σπίτι. Κάθε
        σύνδεσμος ισχύει για ένα άτομο και λήγει σε 7 μέρες.
      </p>

      {link && (
        <div className="row-fields" style={{ marginBottom: "0.7rem" }}>
          <input
            type="text"
            value={link}
            readOnly
            onFocus={(e) => e.target.select()}
            style={{ fontSize: "0.8rem" }}
          />

          <button type="button" className="secondary" onClick={copy}>
            {copied ? "Αντιγράφηκε" : "Αντιγραφή"}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <button
        type="button"
        className={link ? "secondary" : ""}
        onClick={createInvite}
        disabled={busy}
      >
        {busy ? "Δημιουργία..." : link ? "Νέος σύνδεσμος" : "Δημιουργία συνδέσμου"}
      </button>
    </div>
  );
}