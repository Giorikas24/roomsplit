// Έξι χρώματα με αρκετή αντίθεση για λευκό κείμενο πάνω
// τους. Δεν είναι τυχαία: επιλέχθηκαν ώστε να ξεχωρίζουν
// μεταξύ τους ακόμα και για κάποιον με αχρωματοψία.
const COLORS = [
  "#14509b",
  "#0f766e",
  "#9a3412",
  "#6d28d9",
  "#a16207",
  "#be123c",
];

// Μετατρέπει το id σε αριθμό, αθροίζοντας τους κωδικούς
// των χαρακτήρων. Το ίδιο id δίνει πάντα το ίδιο χρώμα,
// σε κάθε συσκευή και κάθε φόρτωση.
export function colorForId(id) {
  let sum = 0;

  for (const char of String(id)) {
    sum += char.codePointAt(0);
  }

  return COLORS[sum % COLORS.length];
}

// Τα αρχικά από το όνομα. Παίρνουμε το πρώτο γράμμα από
// τις δύο πρώτες λέξεις, ώστε το "Γιώργος Λ" να γίνει ΓΛ.
export function initialsFor(name) {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);

  return parts.map((p) => p[0] ?? "").join("");
}