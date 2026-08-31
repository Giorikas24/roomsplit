import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { formatEuro, formatDate } from "../lib/format.js";
import { useGroupEvents } from "../lib/useGroupEvents.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import ExpenseForm from "../components/ExpenseForm.jsx";
import Balances from "../components/Balances.jsx";
import RecurringSection from "../components/RecurringSection.jsx";
import InviteBox from "../components/InviteBox.jsx";

export default function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showMore, setShowMore] = useState(false);

  // Ποιο έξοδο επεξεργαζόμαστε. Κρατάμε το id και όχι
  // ολόκληρο το αντικείμενο, ώστε μετά από ανανέωση των
  // δεδομένων η φόρμα να δείχνει τις φρέσκες τιμές.
  const [editingId, setEditingId] = useState(null);

  async function load() {
    try {
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
          ? "Αυτό το σπίτι δεν υπάρχει ή δεν είσαι μέλος του."
          : "Τα δεδομένα δεν φορτώθηκαν. Ανανέωσε τη σελίδα."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
  }, [groupId]);

  // Όταν αλλάξει κάτι από άλλον συγκάτοικο, ξαναζητάμε τα
  // δεδομένα αθόρυβα, χωρίς να χαθεί η θέση του χρήστη.
  useGroupEvents(groupId, load);

  if (loading) {
    return <p className="muted">Φόρτωση...</p>;
  }

  if (error) {
    return (
      <>
        <p className="error">{error}</p>
        <Link to="/">Πίσω στα σπίτια</Link>
      </>
    );
  }

  const mine = balances.find((b) => b.id === user.id);
  const myCents = mine ? mine.balanceCents : 0;

  const myTransfer = transfers.find(
    (t) => t.fromUserId === user.id || t.toUserId === user.id
  );

  const editingExpense = expenses.find((e) => e.id === editingId) ?? null;

  return (
    <>
      <h1>{group.name}</h1>

      <div className="avatar-row" style={{ marginTop: "0.6rem" }}>
        {group.members.map((m) => (
          <Avatar key={m.id} id={m.id} name={m.name} small />
        ))}
        <span className="muted">
          {group.members.length === 1
            ? "1 άτομο"
            : `${group.members.length} άτομα`}
        </span>
      </div>

      <div className="hero">
        <div className="hero-label">
          {myCents === 0
            ? "Η κατάστασή σου"
            : myCents > 0
              ? "Σου χρωστάνε"
              : "Χρωστάς"}
        </div>

        <div
          className={
            myCents === 0
              ? "hero-value"
              : myCents > 0
                ? "hero-value positive"
                : "hero-value negative"
          }
        >
          {myCents === 0 ? "Είσαι στα ίσια" : formatEuro(Math.abs(myCents))}
        </div>

        {myTransfer && (
          <p className="hero-note">
            {myTransfer.fromUserId === user.id
              ? `Δώσε ${formatEuro(myTransfer.amountCents)} στον ${myTransfer.toName}.`
              : `Ο ${myTransfer.fromName} σου δίνει ${formatEuro(myTransfer.amountCents)}.`}
          </p>
        )}
      </div>

      <Balances
        groupId={groupId}
        balances={balances}
        transfers={transfers}
        onSettled={load}
      />

      <div className="section-title">
        <span>Έξοδα</span>

        <button
          type="button"
          className="ghost"
          onClick={() => {
            // Οι δύο φόρμες δεν πρέπει να είναι ανοιχτές
            // ταυτόχρονα, γιατί μπερδεύεται ποια αποθηκεύει.
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Άκυρο" : "Νέο έξοδο"}
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: "0.7rem" }}>
          <ExpenseForm
            groupId={groupId}
            members={group.members}
            currentUserId={user.id}
            onSaved={async () => {
              await load();
              setShowForm(false);
            }}
          />
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="empty">
          Κανένα έξοδο ακόμα. Καταχώρησε το πρώτο για να αρχίσουν οι
          υπολογισμοί.
        </div>
      ) : (
        <ul className="list">
          {expenses.map((expense) => (
            <li key={expense.id} className="list-item">
              {editingId === expense.id ? (
                // Η φόρμα αντικαθιστά τη γραμμή, αντί να
                // ανοίγει σε παράθυρο. Έτσι ο χρήστης βλέπει
                // πού ακριβώς επεμβαίνει.
                <ExpenseForm
                  groupId={groupId}
                  members={group.members}
                  currentUserId={user.id}
                  expense={editingExpense}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    await load();
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className="row">
                    <span className="avatar-row">
                      <Avatar
                        id={expense.paidBy.id}
                        name={expense.paidBy.name}
                        small
                      />
                      <strong>{expense.description}</strong>
                    </span>

                    <span className="avatar-row">
                      {expense.isPending ? (
                        <span className="tag tag-pending">εκκρεμεί</span>
                      ) : (
                        <span className="amount">
                          {formatEuro(expense.amountCents)}
                        </span>
                      )}

                      <button
                        type="button"
                        className="item-edit"
                        onClick={() => {
                          setShowForm(false);
                          setEditingId(expense.id);
                        }}
                      >
                        {expense.isPending ? "Συμπλήρωση" : "Αλλαγή"}
                      </button>
                    </span>
                  </div>

                  <span className="muted">
                    {formatDate(expense.date)} · πλήρωσε {expense.paidBy.name}
                    {!expense.isPending &&
                      ` · ${expense.shares.length === group.members.length ? "όλοι" : expense.shares.map((s) => s.name).join(", ")}`}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="section-title">
        <span>Ρυθμίσεις σπιτιού</span>

        <button
          type="button"
          className="ghost"
          onClick={() => setShowMore(!showMore)}
        >
          {showMore ? "Απόκρυψη" : "Εμφάνιση"}
        </button>
      </div>

      {showMore && (
        <>
          <InviteBox groupId={groupId} />

          <RecurringSection
            groupId={groupId}
            members={group.members}
            currentUserId={user.id}
            onChanged={load}
          />
        </>
      )}
    </>
  );
}