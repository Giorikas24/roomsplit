import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Groups() {
  const { user } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Η φόρμα ξεκινάει κλειστή. Ο κύριος σκοπός της οθόνης
  // είναι να μπεις σε ένα σπίτι, όχι να φτιάξεις καινούργιο.
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const data = await apiFetch("/api/groups");
      setGroups(data.groups);
      setError(null);
    } catch {
      setError("Η λίστα δεν φορτώθηκε. Ανανέωσε τη σελίδα.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();

    setCreating(true);

    try {
      await apiFetch("/api/groups", { method: "POST", body: { name } });

      setName("");
      setOpen(false);
      await load();
    } catch {
      setError("Το σπίτι δεν δημιουργήθηκε. Δοκίμασε ξανά.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <h1>Γεια σου, {user.name.split(" ")[0]}</h1>
      <p className="muted">Διάλεξε σπίτι για να δεις τα έξοδα και τα υπόλοιπα.</p>

      <div className="section-title">
        <span>Σπίτια</span>

        <button type="button" className="ghost" onClick={() => setOpen(!open)}>
          {open ? "Άκυρο" : "Νέο σπίτι"}
        </button>
      </div>

      {open && (
        <div className="panel" style={{ marginBottom: "0.7rem" }}>
          <form onSubmit={handleCreate}>
            <label>
              Όνομα σπιτιού
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Εγνατία 120"
                required
                maxLength={60}
                autoFocus
              />
            </label>

            <button type="submit" disabled={creating || name.trim() === ""}>
              {creating ? "Δημιουργία..." : "Δημιουργία σπιτιού"}
            </button>
          </form>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading && <p className="muted">Φόρτωση...</p>}

      {/* Η κενή οθόνη είναι πρόσκληση για δράση, όχι
          ανακοίνωση ότι δεν υπάρχει τίποτα. */}
      {!loading && groups.length === 0 && (
        <div className="empty">
          Δεν είσαι σε κανένα σπίτι ακόμα.
          <br />
          Φτιάξε ένα ή ζήτησε από τον συγκάτοικό σου σύνδεσμο πρόσκλησης.
        </div>
      )}

      {groups.length > 0 && (
        <ul className="list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/groups/${group.id}`} className="list-link">
                <Avatar id={group.id} name={group.name} />

                <span className="grow">
                  <strong>{group.name}</strong>
                  <br />
                  <span className="muted">
                    {group.memberCount === 1
                      ? "1 άτομο"
                      : `${group.memberCount} άτομα`}
                  </span>
                </span>

                {group.role === "OWNER" && (
                  <span className="tag tag-owner">δικό σου</span>
                )}

                <span className="chevron">›</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}