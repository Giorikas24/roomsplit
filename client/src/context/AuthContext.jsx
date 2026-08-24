import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch, refreshSession, setAccessToken } from "../lib/api.js";

// Το context επιτρέπει σε οποιοδήποτε component να δει
// ποιος είναι συνδεδεμένος, χωρίς να περνάμε τον χρήστη
// χειροκίνητα από γονιό σε παιδί σε κάθε επίπεδο.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Ξεκινάμε σε κατάσταση φόρτωσης, γιατί μέχρι να
  // απαντήσει το refresh δεν ξέρουμε αν ο χρήστης είναι
  // συνδεδεμένος. Χωρίς αυτό, θα εμφανιζόταν για μια
  // στιγμή η οθόνη login σε κάθε refresh της σελίδας.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Στην εκκίνηση, δοκιμάζουμε να ανακτήσουμε τη
    // συνεδρία από το refresh cookie.
    refreshSession()
      .then((restored) => setUser(restored))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });

    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      // Καθαρίζουμε την τοπική κατάσταση ακόμα κι αν το
      // αίτημα αποτύχει. Ο χρήστης πάτησε αποσύνδεση και
      // αυτό πρέπει να γίνει σεβαστό ούτως ή άλλως.
      setAccessToken(null);
      setUser(null);
    }
  }

  const value = { user, loading, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Βοηθητικό hook, ώστε τα components να γράφουν
// useAuth() αντί για useContext(AuthContext).
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}