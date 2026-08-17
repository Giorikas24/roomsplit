import bcrypt from "bcryptjs";

// Το cost factor ορίζει πόσο αργός είναι ο υπολογισμός.
// Το 12 σημαίνει 2 στη δωδέκατη επαναλήψεις, δηλαδή 4096.
// Η αργία είναι το ζητούμενο: κάνει τις επιθέσεις με
// δοκιμή εκατομμυρίων κωδικών πρακτικά ασύμφορες.
const COST = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, COST);
}

// Δεν αποκρυπτογραφούμε ποτέ. Ξανακρυπτογραφούμε αυτό
// που έδωσε ο χρήστης και συγκρίνουμε τα αποτελέσματα.
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
