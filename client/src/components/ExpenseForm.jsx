import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { euroToCents, todayIso } from "../lib/format.js";

// Δέχεται τα μέλη και μια συνάρτηση που θα κληθεί μετά
// την επιτυχία, ώστε ο γονιός να ξαναφορτώσει τη λίστα.
export default function ExpenseForm({ groupId, members, currentUserId, onCreated }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [paidById, setPaidById] = useState(currentUserId);

  // Ξεκινάμε με όλους επιλεγμένους, γιατί αυτή είναι η
  // συνηθέστερη περίπτωση σε κοινόχρηστα έξοδα.
  const [participantIds, setParticipantIds] = useState(
    members.map((m) => m.id)
  );

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function toggleParticipant(id) {
    setParticipantIds((current) =>
      // Αν υπάρχει ήδη, τον βγάζουμε. Αλλιώς τον βάζουμε.
      // Φτιάχνουμε πάντα νέο πίνακα αντί να αλλάξουμε τον
      // παλιό, γιατί ο React συγκρίνει αναφορές και δεν θα
      // καταλάβαινε την αλλαγή.
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountCents = euroToCents(amount);

    if (amountCents === null || amountCents <= 0) {
      setError("Δώσε έγκυρο ποσό.");
      return;
    }

    if (participantIds.length === 0) {
      setError("Διάλεξε τουλάχιστον έναν συμμετέχοντα.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/api/groups/${groupId}/expenses`, {
        method: "POST",
        body: { description, amountCents, date, paidById, participantIds },
      });

      // Καθαρίζουμε μόνο τα πεδία που αλλάζουν κάθε φορά.
      // Η ημερομηνία, ο πληρωτής και οι συμμετέχοντες
      // μένουν, γιατί συνήθως καταχωρείς πολλά έξοδα
      // με τα ίδια στοιχεία.
      setDescription("");
      setAmount("");

      await onCreated();
    } catch {
      setError("Δεν μπόρεσα να καταχωρήσω το έξοδο.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="expense-form">
      <label>
        Περιγραφή
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={120}
        />
      </label>

      <div className="row">
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
        Πλήρωσε
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
          <label key={m.id} className="checkbox">
            <input
              type="checkbox"
              checked={participantIds.includes(m.id)}
              onChange={() => toggleParticipant(m.id)}
            />
            {m.name}
          </label>
        ))}
      </fieldset>

      {error && <p className="error">{error}</p>}

      <button type="submit" disabled={busy}>
        {busy ? "Καταχώρηση..." : "Καταχώρηση εξόδου"}
      </button>
    </form>
  );
}