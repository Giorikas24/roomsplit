import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Τυλίγει σελίδες που απαιτούν σύνδεση.
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  // Όσο ελέγχουμε το refresh cookie δεν ξέρουμε ακόμα.
  // Χωρίς αυτό, θα πεταγόταν στιγμιαία η οθόνη login
  // σε κάθε ανανέωση της σελίδας.
  if (loading) {
    return <p>Φόρτωση...</p>;
  }

  // Το replace αντικαθιστά την τρέχουσα καταχώρηση στο
  // ιστορικό, ώστε το κουμπί πίσω να μη γυρίζει σε
  // σελίδα που ούτως ή άλλως θα ξαναπετάξει έξω.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
