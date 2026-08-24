import { useAuth } from "../context/AuthContext.jsx";

// Προσωρινή. Στο Stage 9 θα γίνει η λίστα των σπιτιών.
export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Καλώς ήρθες, {user.name}</h1>
      <p>{user.email}</p>
      <button onClick={logout}>Αποσύνδεση</button>
    </div>
  );
}
