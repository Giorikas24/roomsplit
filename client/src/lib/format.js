// Ο server δουλεύει σε λεπτά, ο χρήστης σκέφτεται σε ευρώ.
// Η μετατροπή γίνεται μόνο εδώ, στο τελευταίο σημείο πριν
// την οθόνη, ώστε πουθενά αλλού να μη μπουν δεκαδικοί.
export function formatEuro(cents) {
  return (cents / 100).toLocaleString("el-GR", {
    style: "currency",
    currency: "EUR",
  });
}

// Μετατρέπει ευρώ από πεδίο κειμένου σε ακέραια λεπτά.
// Το Math.round είναι απαραίτητο: το 19.99 επί 100 δίνει
// 1998.9999999999998 σε δεκαδική αριθμητική υπολογιστή.
export function euroToCents(value) {
  const number = Number(String(value).replace(",", "."));

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(number * 100);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Η σημερινή ημερομηνία σε μορφή ΕΕΕΕ-ΜΜ-ΗΗ, για
// προεπιλογή στα πεδία ημερομηνίας.
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}