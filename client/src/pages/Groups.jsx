import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Link } from "react-router-dom";

export default function Groups() {
  const { user, logout } = useAuth();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  // Φορτώνει τη λίστα. Την ορίζουμε ξεχωριστά ώστε να
  // μπορούμε να την ξανακαλέσουμε μετά τη δημιουργία.
  async function load() {
    try {
      const data = await apiFetch("/api/groups");
      setGroups(data.groups);
      setError(null);
    } catch {
      setError("Δεν μπόρεσα να φορτώσω τα σπίτια σου.");
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
      await apiFetch("/api/groups", {
        method: "POST",
        body: { name },
      });

      // Καθαρίζουμε το πεδίο και ξαναφορτώνουμε, ώστε ο
      // μετρητής μελών να έρθει από τον server και να μη
      // μαντεύουμε εμείς τι έγραψε η βάση.
      setName("");
      await load();
    } catch {
      setError("Δεν μπόρεσα να δημιουργήσω το σπίτι.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <header className="topbar">
        <span>{user.name}</span>
        <button className="link-button" onClick={logout}>
          Αποσύνδεση
        </button>
      </header>

      <h1>Τα σπίτια μου</h1>

      <form onSubmit={handleCreate} className="inline-form">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Όνομα σπιτιού"
          required
          maxLength={60}
        />
        <button type="submit" disabled={creating || name.trim() === ""}>
          {creating ? "..." : "Δημιουργία"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && <p>Φόρτωση...</p>}

      {/* Τρεις καταστάσεις: φόρτωση, κενό, λίστα. Η κενή
          κατάσταση είναι σημαντική, γιατί χωρίς αυτήν ο
          νέος χρήστης βλέπει άδεια οθόνη και δεν ξέρει
          τι να κάνει. */}
      {!loading && groups.length === 0 && (
        <p>Δεν έχεις σπίτια ακόμα. Φτιάξε το πρώτο σου παραπάνω.</p>
      )}

      <ul className="card-list">
        {groups.map((group) => (
                    <li key={group.id}>
            <Link to={`/groups/${group.id}`} className="card card-link">
              <strong>{group.name}</strong>
              <span className="muted">
                {group.memberCount} μέλη
                {group.role === "OWNER" ? " · διαχειριστής" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}