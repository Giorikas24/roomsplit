import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { formatEuro, formatDate } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import ExpenseForm from "../components/ExpenseForm.jsx";
import Balances from "../components/Balances.jsx";
import RecurringSection from "../components/RecurringSection.jsx";

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      // Τέσσερα αιτήματα παράλληλα. Όλα εξαρτώνται από τα
      // ίδια δεδομένα, οπότε ανανεώνονται πάντα μαζί.
      const [groupData, expensesData, balancesData, settleData] =
        await Promise.all([
          apiFetch(`/api/groups/${groupId}`),
          apiFetch(`/api/groups/${groupId}/expenses`),
          apiFetch(`/api/groups/${groupId}/balances`),
          apiFetch(`/api/groups/${groupId}/settlements/suggested`),
        ]);

      setGroup(groupData.group);
      setExpenses(expensesData.expenses);
      setBalances(balancesData.balances);
      setTransfers(settleData.transfers);
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

      <p className="muted">{group.members.map((m) => m.name).join(", ")}</p>

      <Balances
        groupId={groupId}
        balances={balances}
        transfers={transfers}
        onSettled={load}
      />

      <h2>Έξοδα</h2>

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
                {expense.isPending
                  ? "εκκρεμεί"
                  : formatEuro(expense.amountCents)}
              </span>
            </div>

            <span className="muted">
              {formatDate(expense.date)} · πλήρωσε {expense.paidBy.name}
            </span>

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
            <RecurringSection
        groupId={groupId}
        members={group.members}
        currentUserId={user.id}
        onChanged={load}
      />
    </div>
  );
}