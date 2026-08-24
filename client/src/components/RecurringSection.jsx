import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { formatEuro, euroToCents } from "../lib/format.js";

export default function RecurringSection({ groupId, members, currentUserId, onChanged }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [paidById, setPaidById] = useState(currentUserId);
  const [participantIds, setParticipantIds] = useState(members.map((m) => m.id));

  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await apiFetch(`/api/groups/${groupId}/recurring`);
      setRules(data.rules);
    } catch {
      setError("Δεν μπόρεσα να φορτώσω τα πάγια.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [groupId]);

  function toggleParticipant(id) {
    setParticipantIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Κενό ποσό σημαίνει μεταβλητό, π.χ. ρεύμα. Στέλνουμε
    // null και ο server θα φτιάχνει εκκρεμή έξοδα.
    const amountCents = amount.trim() === "" ? null : euroToCents(amount);

    if (amountCents !== null && (amountCents === null || amountCents <= 0)) {
      setError("Δώσε έγκυρο ποσό ή άφησέ το κενό.");
      return;
    }

    if (participantIds.length === 0) {
      setError("Διάλεξε τουλάχιστον έναν συμμετέχοντα.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/api/groups/${groupId}/recurring`, {
        method: "POST",
        body: {
          description,
          amountCents,
          dayOfMonth: Number(dayOfMonth),
          paidById,
          participantIds,
        },
      });

      setDescription("");
      setAmount("");

      await load();
      await onChanged();
    } catch {
      setError("Δεν μπόρεσα να δημιουργήσω τον κανόνα.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(ruleId) {
    try {
      await apiFetch(`/api/groups/${groupId}/recurring/${ruleId}/deactivate`, {
        method: "PATCH",
      });

      await load();
    } catch {
      setError("Δεν μπόρεσα να σταματήσω τον κανόνα.");
    }
  }

  // Δείχνουμε μόνο τους ενεργούς. Οι σταματημένοι μένουν
  // στη βάση για το ιστορικό, αλλά δεν γεμίζουν την οθόνη.
  const active = rules.filter((r) => r.active);

  return (
    <>
      <h2>Πάγια έξοδα</h2>

      <p className="muted">
        Δημιουργούνται αυτόματα κάθε μήνα. Αν αφήσεις το ποσό κενό,
        θα εμφανίζεται ως εκκρεμές για να το συμπληρώσεις.
      </p>

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
            Ποσό σε ευρώ, προαιρετικό
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="π.χ. 30,00"
            />
          </label>

          <label>
            Ημέρα του μήνα
            <input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
              required
            />
          </label>
        </div>

        <label>
          Πληρώνει
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
          {busy ? "Δημιουργία..." : "Προσθήκη πάγιου"}
        </button>
      </form>

      {loading && <p className="muted">Φόρτωση...</p>}

      {!loading && active.length === 0 && (
        <p className="muted">Δεν έχεις πάγια έξοδα.</p>
      )}

      <ul className="card-list">
        {active.map((rule) => (
          <li key={rule.id} className="card">
            <div className="row">
              <strong>{rule.description}</strong>
              <span>
                {rule.amountCents === null
                  ? "μεταβλητό"
                  : formatEuro(rule.amountCents)}
              </span>
            </div>

            <span className="muted">
              κάθε {rule.dayOfMonth} του μήνα · πληρώνει {rule.paidBy.name}
            </span>

            <button type="button" onClick={() => deactivate(rule.id)}>
              Σταμάτημα
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}