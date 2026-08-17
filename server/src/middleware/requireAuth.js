import { verifyAccessToken } from "../lib/tokens.js";

// Middleware είναι συνάρτηση που τρέχει πριν το endpoint.
// Είτε σταματάει το αίτημα με απάντηση, είτε καλεί next()
// για να συνεχίσει η ροή προς το endpoint.
export function requireAuth(req, res, next) {
  // Το πρότυπο θέλει header της μορφής: Bearer <token>
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const payload = verifyAccessToken(token);
    // Κρεμάμε το id στο req ώστε να το βρίσκουν τα endpoints.
    // Ποτέ δεν εμπιστευόμαστε id που στέλνει ο χρήστης στο body.
    req.userId = payload.sub;
    next();
  } catch {
    // Πιάνει και ληγμένο και παραποιημένο token. Δεν λέμε
    // ποιο από τα δύο, γιατί δεν βοηθάει τον χρήστη και
    // βοηθάει τον επιτιθέμενο.
    return res.status(401).json({ error: "invalid_token" });
  }
}
