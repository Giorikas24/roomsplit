import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Groups from "./pages/Groups.jsx";

export default function App() {
  return (
    // Ο BrowserRouter πρέπει να τυλίγει τα πάντα που
    // χρησιμοποιούν navigation, και ο AuthProvider τα
    // πάντα που χρειάζονται τον χρήστη.
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <RequireAuth>
                <Groups />
              </RequireAuth>
            }
          />

          {/* Ο αστερίσκος πιάνει οτιδήποτε δεν ταίριαξε
              παραπάνω, ώστε μια λάθος διεύθυνση να μην
              εμφανίζει κενή σελίδα. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
