import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { euroToCents, todayIso } from "../lib/format.js";

export default function ExpenseForm({ groupId, members, currentUserId, onCreated }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [paidById, setPaidById] = useState(currentUserId);
  const [participantIds, setParticipantIds] = useState(members.map((m) => m.id));

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function toggleParticipant(id) {
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  // Ζωντανή προεπισκόπηση του μοιράσματος. Ο χρήστης
  // βλέπει τι θα χρεωθεί ο καθένας πριν πατήσει, χωρίς
  // να χρειάζεται να το υπολογίσει στο μυαλό του.
  const cents = euroToCents(amount);
  const perPerson =
    cents && cents > 0 && participantIds.length > 0
      ? Math.floor(cents / participantIds.length)
      : null;

  async function handleSubmit(event) {
    event.preventDefault();

    if (cents === null || cents <= 0) {
      setError("Γράψε ποσό μεγαλύτερο από μηδέν.");
      return;
    }

    if (participantIds.length === 0) {
      setError("Διάλεξε ποιοι μοιράζονται το έξοδο.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        body: {
          description,
          amountCents: cents,
          date,
          paidById,
          participantIds,
        },
      });

      // Καθαρίζουμε μόνο όσα αλλάζουν σε κάθε έξοδο. Η
      // ημερομηνία και οι συμμετέχοντες μένουν, γιατί
      // συνήθως καταχωρείς πολλά στη σειρά.
      setDescription("");
      setAmount("");

      await onCreated();
    } catch {
      setError("Το έξοδο δεν καταχωρήθηκε. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <form onSubmit={handleSubmit}>
        <label>
          Τι ήταν
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="π.χ. σούπερ μάρκετ"
            required
            maxLength={120}
            autoFocus
          />
        </label>

        <div className="row-fields">
          <label>
            Ποσό σε ευρώ
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="19,99"
              required
            />
          </label>

          <label>
            Ημερομηνία
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Ποιος πλήρωσε
          <select value={paidById} onChange={(e) => setPaidById(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend>Μοιράζεται σε</legend>

          {members.map((m) => (
            <label
              key={m.id}
              className={
                participantIds.includes(m.id) ? "chip on" : "chip"
              }
            >
              <input
                type="checkbox"
                checked={participantIds.includes(m.id)}
                onChange={() => toggleParticipant(m.id)}
              />
              {m.name}
            </label>
          ))}
        </fieldset>

        {perPerson !== null && (
          <p className="muted">
            Αναλογεί περίπου{" "}
            <span className="amount">
              {(perPerson / 100).toLocaleString("el-GR", {
                style: "currency",
                currency: "EUR",
              })}
            </span>{" "}
            στον καθένα.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? "Καταχώρηση..." : "Καταχώρηση εξόδου"}
        </button>
      </form>
    </div>
  );
}