import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { formatEuro } from "../lib/format.js";
import Avatar from "./Avatar.jsx";

export default function Balances({ groupId, balances, transfers, onSettled }) {
  const [busyIndex, setBusyIndex] = useState(null);
  const [error, setError] = useState(null);

  // Το μεγαλύτερο υπόλοιπο ορίζει την κλίμακα των μπαρών.
  // Το 1 στο τέλος αποτρέπει διαίρεση με μηδέν όταν όλοι
  // είναι στα ίσια τους.
  const scale = Math.max(...balances.map((b) => Math.abs(b.balanceCents)), 1);

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
      setError("Η εξόφληση δεν καταγράφηκε. Δοκίμασε ξανά.");
    } finally {
      setBusyIndex(null);
    }
  }

  return (
    <>
      <div className="section-title">
        <span>Εξόφληση</span>
      </div>

      {transfers.length === 0 ? (
        <div className="empty">Κανείς δεν χρωστάει σε κανέναν.</div>
      ) : (
        <ul className="list">
          {transfers.map((t, index) => (
            <li key={`${t.fromUserId}-${t.toUserId}`} className="list-item">
              <div className="row">
                <span className="avatar-row">
                  <Avatar id={t.fromUserId} name={t.fromName} small />
                  <span>
                    {t.fromName} <span className="chevron">→</span> {t.toName}
                  </span>
                </span>

                <span className="amount">{formatEuro(t.amountCents)}</span>
              </div>

              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => settle(t, index)}
                  disabled={busyIndex !== null}
                >
                  {busyIndex === index ? "Καταγραφή..." : "Πληρώθηκε"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}

      <div className="section-title">
        <span>Υπόλοιπα</span>
      </div>

      <ul className="list">
        {balances.map((b) => {
          // Κάθε πλευρά πιάνει το πολύ το μισό πλάτος, γι'
          // αυτό πολλαπλασιάζουμε με 50 και όχι με 100.
          const width = (Math.abs(b.balanceCents) / scale) * 50;

          return (
            <li key={b.id} className="list-item">
              <div className="row">
                <span className="avatar-row">
                  <Avatar id={b.id} name={b.name} small />
                  <span>{b.name}</span>
                </span>

                <span
                  className={
                    b.balanceCents === 0
                      ? "muted"
                      : b.balanceCents > 0
                        ? "amount positive"
                        : "amount negative"
                  }
                >
                  {b.balanceCents === 0
                    ? "στα ίσια"
                    : b.balanceCents > 0
                      ? `+${formatEuro(b.balanceCents)}`
                      : `-${formatEuro(-b.balanceCents)}`}
                </span>
              </div>

              <div className="bar">
                {b.balanceCents !== 0 && (
                  <div
                    className={
                      b.balanceCents > 0 ? "bar-fill owed" : "bar-fill owes"
                    }
                    style={{ width: `${width}%` }}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}