import crypto from "node:crypto";
import jwt from "jsonwebtoken";

// Ο χρόνος ζωής. Το access είναι σύντομο επειδή ταξιδεύει
// σε κάθε αίτημα και δεν μπορεί να ακυρωθεί. Αν κλαπεί,
// θέλουμε να πεθάνει γρήγορα από μόνο του.
const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

export function signAccessToken(userId) {
  return jwt.sign(
    // Το jti είναι μοναδικό αναγνωριστικό του token.
    // Χωρίς αυτό, δύο tokens που φτιάχνονται στο ίδιο
    // δευτερόλεπτο βγαίνουν πανομοιότυπα.
    { sub: userId, jti: crypto.randomUUID() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

export function signRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TTL }
  );
}

// Επιστρέφει το περιεχόμενο αν το token είναι έγκυρο,
// αλλιώς ρίχνει σφάλμα. Δεν το πιάνουμε εδώ, το αφήνουμε
// να φτάσει σε όποιον καλεί, ώστε εκείνος να αποφασίσει
// τι κωδικό απάντησης θα στείλει.
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}
