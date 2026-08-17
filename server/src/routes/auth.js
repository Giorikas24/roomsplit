import express from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/tokens.js";
import { registerSchema, loginSchema } from "../schemas/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

const REFRESH_COOKIE = "refreshToken";

// Ρυθμίσεις του cookie που κρατάει το refresh token.
const refreshCookieOptions = {
  // Το httpOnly το κρύβει από τη JavaScript του browser.
  // Είναι η βασική άμυνα: ακόμα κι αν κάποιος καταφέρει να
  // τρέξει κώδικα στη σελίδα, δεν μπορεί να το διαβάσει.
  httpOnly: true,
  // Σε production στέλνεται μόνο μέσω https.
  secure: process.env.NODE_ENV === "production",
  // Το lax εμποδίζει να σταλεί το cookie από άλλο site,
  // που είναι η άμυνα απέναντι σε επιθέσεις CSRF.
  sameSite: "lax",
  // Στέλνεται μόνο στα endpoints του auth, πουθενά αλλού.
  path: "/api/auth",
  // Επτά μέρες σε χιλιοστά του δευτερολέπτου.
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res, userId) {
  res.cookie(REFRESH_COOKIE, signRefreshToken(userId), refreshCookieOptions);
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(409).json({ error: "email_taken" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  setRefreshCookie(res, user.id);

  return res.status(201).json({ user, accessToken: signAccessToken(user.id) });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Ίδια απάντηση και για ανύπαρκτο email και για λάθος
  // κωδικό. Αν τα ξεχωρίζαμε, ο επιτιθέμενος θα μπορούσε
  // να μάθει ποια emails έχουν λογαριασμό.
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const ok = await verifyPassword(password, user.passwordHash);

  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  setRefreshCookie(res, user.id);

  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    accessToken: signAccessToken(user.id),
  });
});

router.post("/refresh", async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];

  if (!token) {
    return res.status(401).json({ error: "missing_refresh_token" });
  }

  let payload;

  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: "invalid_refresh_token" });
  }

  // Ελέγχουμε ότι ο χρήστης υπάρχει ακόμα. Ένα token μένει
  // έγκυρο επτά μέρες, οπότε ο λογαριασμός μπορεί να έχει
  // διαγραφεί στο μεταξύ.
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return res.status(401).json({ error: "invalid_refresh_token" });
  }

  // Δίνουμε καινούργιο refresh cookie σε κάθε ανανέωση.
  // Λέγεται rotation και περιορίζει τη ζημιά αν κάποιο
  // παλιό token διαρρεύσει.
  setRefreshCookie(res, user.id);

  return res.json({ user, accessToken: signAccessToken(user.id) });
});

router.post("/logout", (req, res) => {
  // Το clearCookie πρέπει να έχει ίδιο path με το cookie,
  // αλλιώς ο browser δεν το βρίσκει και μένει ενεργό.
  res.clearCookie(REFRESH_COOKIE, { path: refreshCookieOptions.path });
  return res.status(204).end();
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }

  return res.json({ user });
});

export default router;