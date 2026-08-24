import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { formatEuro } from "../lib/format.js";

export default function Balances({ groupId, balances, transfers, onSettled }) {
  const [busyIndex, setBusyIndex] = useState(null);
  const [error, setError] = useState(null);

  // Καταγράφει την εξόφληση ακριβώς όπως την πρότεινε ο
  // αλγόριθμος. Το busyIndex κρατάει ποια σειρά τρέχει,
  // ώστε να κλειδώνει μόνο το συγκεκριμένο κουμπί.
  async function settle(transfer, index) {
    setBusyIndex(index);
    setError(null);

    try {
      await apiFetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        body: {
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          amountCents: transfer.amountCents,
        },
      });

      await onSettled();
    } catch {
      setError("Δεν μπόρεσα να καταγράψω την εξόφληση.");
    } finally {
      setBusyIndex(null);
    }
  }

  return (
    <>
      <h2>Υπόλοιπα</h2>

      <ul className="card-list">
        {balances.map((b) => (
          <li key={b.id} className="card">
            <div className="row">
              <strong>{b.name}</strong>

              {/* Τρεις καταστάσεις με διαφορετικό νόημα, όχι
                  απλώς διαφορετικό χρώμα. Το πρόσημο μόνο του
                  δεν λέει σε κανέναν τι σημαίνει. */}
              <span className={b.balanceCents === 0 ? "muted" : b.balanceCents > 0 ? "positive" : "negative"}>
                {b.balanceCents === 0
                  ? "είναι εντάξει"
                  : b.balanceCents > 0
                    ? `του χρωστάνε ${formatEuro(b.balanceCents)}`
                    : `χρωστάει ${formatEuro(-b.balanceCents)}`}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <h2>Εξόφληση</h2>

      {transfers.length === 0 && (
        <p className="muted">Όλα κλειστά, δεν χρωστάει κανείς σε κανέναν.</p>
      )}

      {error && <p className="error">{error}</p>}

      <ul className="card-list">
        {transfers.map((t, index) => (
          // Εδώ το key είναι ο συνδυασμός των δύο ατόμων.
          // Δεν υπάρχει id, γιατί οι μεταφορές υπολογίζονται
          // κάθε φορά και δεν αποθηκεύονται πουθενά.
          <li key={`${t.fromUserId}-${t.toUserId}`} className="card">
            <div className="row">
              <span>
                <strong>{t.fromName}</strong> προς{" "}
                <strong>{t.toName}</strong>
              </span>
              <strong>{formatEuro(t.amountCents)}</strong>
            </div>

            <button
              type="button"
              onClick={() => settle(t, index)}
              disabled={busyIndex !== null}
            >
              {busyIndex === index ? "Καταγραφή..." : "Πληρώθηκε"}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}