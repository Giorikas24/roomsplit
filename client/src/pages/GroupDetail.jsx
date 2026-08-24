import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { formatEuro, formatDate } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import ExpenseForm from "../components/ExpenseForm.jsx";

export default function GroupDetail() {
  // Διαβάζει το :groupId από τη διεύθυνση. Το όνομα πρέπει
  // να ταιριάζει με αυτό που δηλώνουμε στο Route.
  const { groupId } = useParams();

  // Χρειαζόμαστε το id του συνδεδεμένου χρήστη, ώστε η
  // φόρμα να προεπιλέγει αυτόν ως πληρωτή.
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      // Promise.all τρέχει τα δύο αιτήματα παράλληλα αντί
      // για το ένα μετά το άλλο. Με βάση που κοιμάται,
      // η διαφορά είναι αισθητή.
      const [groupData, expensesData] = await Promise.all([
        apiFetch(`/api/groups/${groupId}`),
        apiFetch(`/api/groups/${groupId}/expenses`),
      ]);

      setGroup(groupData.group);
      setExpenses(expensesData.expenses);
      setError(null);
    } catch (err) {
      setError(
        err.status === 404
          ? "Το σπίτι δεν βρέθηκε ή δεν έχεις πρόσβαση."
          : "Κάτι πήγε στραβά."
      );
    } finally {
      setLoading(false);
    }
  }

  // Το groupId στον πίνακα εξαρτήσεων σημαίνει: ξανατρέξε
  // αν αλλάξει. Χωρίς αυτό, η μετάβαση από ένα σπίτι σε
  // άλλο θα έδειχνε τα παλιά δεδομένα.
  useEffect(() => {
    setLoading(true);
    load();
  }, [groupId]);

  if (loading) {
    return <p className="page">Φόρτωση...</p>;
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/">Πίσω στα σπίτια</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/">Πίσω</Link>
      </header>

      <h1>{group.name}</h1>

      <p className="muted">
        {group.members.map((m) => m.name).join(", ")}
      </p>

      <h2>Έξοδα</h2>

      {/* Το onCreated παίρνει τη συνάρτηση load, χωρίς
          παρενθέσεις. Με παρενθέσεις θα εκτελούνταν σε
          κάθε σχεδίαση και θα δημιουργούσε ατέρμονο κύκλο. */}
      <ExpenseForm
        groupId={groupId}
        members={group.members}
        currentUserId={user.id}
        onCreated={load}
      />

      {expenses.length === 0 && (
        <p className="muted">Δεν υπάρχουν έξοδα ακόμα.</p>
      )}

      <ul className="card-list">
        {expenses.map((expense) => (
          <li key={expense.id} className="card">
            <div className="row">
              <strong>{expense.description}</strong>
              <span>
                {expense.isPending ? "εκκρεμεί" : formatEuro(expense.amountCents)}
              </span>
            </div>

            <span className="muted">
              {formatDate(expense.date)} · πλήρωσε {expense.paidBy.name}
            </span>

            {/* Τα εκκρεμή δεν έχουν shares, γιατί δεν έχει
                οριστεί ακόμα το ποσό. */}
            {!expense.isPending && (
              <span className="muted">
                {expense.shares
                  .map((s) => `${s.name}: ${formatEuro(s.amountCents)}`)
                  .join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}