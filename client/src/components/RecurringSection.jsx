import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { formatEuro, euroToCents } from "../lib/format.js";
import Avatar from "./Avatar.jsx";

export default function RecurringSection({ groupId, members, currentUserId, onChanged }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
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
      setError("Τα πάγια δεν φορτώθηκαν.");
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
    // null και ο server φτιάχνει εκκρεμή έξοδα προς
    // συμπλήρωση.
    const cents = amount.trim() === "" ? null : euroToCents(amount);

    if (cents !== null && cents <= 0) {
      setError("Γράψε ποσό μεγαλύτερο από μηδέν ή άφησε το πεδίο κενό.");
      return;
    }

    if (participantIds.length === 0) {
      setError("Διάλεξε ποιοι μοιράζονται το πάγιο.");
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await apiFetch(`/api/groups/${groupId}/recurring`, {
        method: "POST",
        body: {
          description,
          amountCents: cents,
          dayOfMonth: Number(dayOfMonth),
          paidById,
          participantIds,
        },
      });

      setDescription("");
      setAmount("");
      setOpen(false);

      await load();
      await onChanged();
    } catch {
      setError("Το πάγιο δεν δημιουργήθηκε. Δοκίμασε ξανά.");
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
      setError("Το πάγιο δεν σταμάτησε. Δοκίμασε ξανά.");
    }
  }

  // Δείχνουμε μόνο τα ενεργά. Τα σταματημένα μένουν στη
  // βάση για το ιστορικό, χωρίς να γεμίζουν την οθόνη.
  const active = rules.filter((r) => r.active);

  return (
    <div className="panel">
      <div className="row">
        <strong>Πάγια έξοδα</strong>

        <button type="button" className="ghost" onClick={() => setOpen(!open)}>
          {open ? "Άκυρο" : "Νέο πάγιο"}
        </button>
      </div>

      <p className="muted" style={{ margin: "0.3rem 0 0.9rem" }}>
        Δημιουργούνται αυτόματα κάθε μήνα. Άφησε το ποσό κενό για
        λογαριασμούς που αλλάζουν, όπως το ρεύμα.
      </p>

      {open && (
        <form onSubmit={handleSubmit} style={{ marginBottom: "1rem" }}>
          <label>
            Τι είναι
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="π.χ. ίντερνετ"
              required
              maxLength={120}
              autoFocus
            />
          </label>

          <div className="row-fields">
            <label>
              Ποσό, προαιρετικό
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="30,00"
              />
            </label>

            <label>
              Ημέρα μήνα
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
            Ποιος πληρώνει
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

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={busy}>
            {busy ? "Δημιουργία..." : "Προσθήκη πάγιου"}
          </button>
        </form>
      )}

      {loading && <p className="muted">Φόρτωση...</p>}

      {!loading && active.length === 0 && (
        <p className="muted">Δεν έχεις πάγια έξοδα.</p>
      )}

      {active.length > 0 && (
        <ul className="list">
          {active.map((rule) => (
            <li key={rule.id} className="list-item">
              <div className="row">
                <span className="avatar-row">
                  <Avatar id={rule.paidBy.id} name={rule.paidBy.name} small />
                  <strong>{rule.description}</strong>
                </span>

                {rule.amountCents === null ? (
                  <span className="tag tag-pending">μεταβλητό</span>
                ) : (
                  <span className="amount">{formatEuro(rule.amountCents)}</span>
                )}
              </div>

              <div className="row">
                <span className="muted">
                  κάθε {rule.dayOfMonth} του μήνα · πληρώνει {rule.paidBy.name}
                </span>

                <button
                  type="button"
                  className="ghost"
                  onClick={() => deactivate(rule.id)}
                >
                  Σταμάτημα
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}