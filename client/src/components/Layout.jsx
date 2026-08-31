import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";

// Η λωρίδα που εμφανίζεται σε κάθε συνδεδεμένη οθόνη.
// Την ορίζουμε μία φορά εδώ, ώστε να μη διαφέρει από
// σελίδα σε σελίδα.
export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="appbar">
        <div className="appbar-inner">
          <Link to="/" className="brand">
            Roomsplit
          </Link>

          <div className="avatar-row">
            <Avatar id={user.id} name={user.name} small />
            <button type="button" className="ghost" onClick={logout}>
              Έξοδος
            </button>
          </div>
        </div>
      </div>

      <div className="page">{children}</div>
    </>
  );
}