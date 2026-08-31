import { useState } from "react";
import { apiFetch } from "../lib/api.js";
import { euroToCents, todayIso } from "../lib/format.js";

export default function ExpenseForm({
  groupId,
  members,
  currentUserId,
  onSaved,
  // Αν δοθεί, η φόρμα επεξεργάζεται αυτό το έξοδο αντί
  // να δημιουργεί καινούργιο.
  expense = null,
  onCancel = null,
}) {
  const editing = expense !== null;

  const [description, setDescription] = useState(
    editing ? expense.description : ""
  );

  // Στα εκκρεμή το ποσό είναι μηδέν και δεν έχει νόημα να
  // το δείξουμε. Αφήνουμε το πεδίο κενό ώστε ο χρήστης να
  // γράψει το πραγματικό.
  const [amount, setAmount] = useState(
    editing && !expense.isPending
      ? (expense.amountCents / 100).toFixed(2).replace(".", ",")
      : ""
  );

  const [date, setDate] = useState(
    editing ? expense.date.slice(0, 10) : todayIso()
  );

  const [paidById, setPaidById] = useState(
    editing ? expense.paidBy.id : currentUserId
  );

  // Τα εκκρεμή δεν έχουν shares, οπότε πέφτουμε πίσω σε
  // όλους τους συγκατοίκους.
  const [participantIds, setParticipantIds] = useState(
    editing && expense.shares.length > 0
      ? expense.shares.map((s) => s.userId)
      : members.map((m) => m.id)
  );

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Δεύτερο πάτημα για επιβεβαίωση διαγραφής. Προτιμάμε
  // αυτό από το παράθυρο του browser, που είναι άσχημο
  // και μπλοκάρει τη σελίδα.
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleParticipant(id) {
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

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
      // Ίδιο σώμα και στις δύο περιπτώσεις. Αλλάζει μόνο
      // η μέθοδος και η διεύθυνση.
      const body = {
        description,
        amountCents: cents,
        date,
        paidById,
        participantIds,
      };

      if (editing) {
        await apiFetch(`/api/groups/${groupId}/expenses/${expense.id}`, {
          method: "PUT",
          body,
        });
      } else {
        await apiFetch(`/api/groups/${groupId}/expenses`, {
          method: "POST",
          body,
        });

        // Μόνο στη δημιουργία καθαρίζουμε, γιατί συνήθως
        // καταχωρείς πολλά έξοδα στη σειρά.
        setDescription("");
        setAmount("");
      }

      await onSaved();
    } catch {
      setError("Δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setBusy(true);

    try {
      await apiFetch(`/api/groups/${groupId}/expenses/${expense.id}`, {
        method: "DELETE",
      });

      await onSaved();
    } catch {
      setError("Η διαγραφή δεν έγινε. Δοκίμασε ξανά.");
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
              className={participantIds.includes(m.id) ? "chip on" : "chip"}
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
          {busy
            ? "Αποθήκευση..."
            : editing
              ? "Αποθήκευση αλλαγών"
              : "Καταχώρηση εξόδου"}
        </button>

        {editing && (
          <div className="row-fields">
            <button
              type="button"
              className="secondary"
              onClick={onCancel}
              disabled={busy}
            >
              Άκυρο
            </button>

            <button
              type="button"
              className="secondary danger"
              onClick={handleDelete}
              disabled={busy}
            >
              {confirmDelete ? "Σίγουρα; Πάτα ξανά" : "Διαγραφή"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}