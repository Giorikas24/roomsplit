import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Groups from "./pages/Groups.jsx";
import GroupDetail from "./pages/GroupDetail.jsx";
import Join from "./pages/Join.jsx";

// Οι προστατευμένες σελίδες χρειάζονται πάντα δύο
// πράγματα: έλεγχο σύνδεσης και τη λωρίδα. Τα ενώνουμε
// σε ένα βοηθητικό, ώστε κάθε Route να μένει μία γραμμή
// και να μη μπορεί να ξεχαστεί το ένα από τα δύο.
function Protected({ children }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <Protected>
                <Groups />
              </Protected>
            }
          />

          <Route
            path="/groups/:groupId"
            element={
              <Protected>
                <GroupDetail />
              </Protected>
            }
          />

          {/* Η πρόσκληση δεν παίρνει Layout. Είναι σελίδα
              απόφασης, όχι πλοήγησης, οπότε κρατάμε την
              οθόνη καθαρή από τη λωρίδα. */}
          <Route
            path="/join/:token"
            element={
              <RequireAuth>
                <Join />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}