import express from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/tokens.js";
import { registerSchema } from "../schemas/auth.js";

// Ο Router είναι μια μίνι εφαρμογή. Μας επιτρέπει να
// ομαδοποιήσουμε σχετικά endpoints σε δικό τους αρχείο,
// αντί να φουσκώνει το app.js με δεκάδες διαδρομές.
const router = express.Router();

router.post("/register", async (req, res) => {
  // Το safeParse δεν ρίχνει σφάλμα, επιστρέφει αποτέλεσμα
  // με ένδειξη επιτυχίας. Έτσι ελέγχουμε ρητά αντί να
  // τυλίγουμε τα πάντα σε try.
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    // Το 400 σημαίνει bad request, δηλαδή έφταιξε ο χρήστης
    // στη μορφή των δεδομένων.
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const { email, password, name } = parsed.data;

  // Ελέγχουμε αν υπάρχει ήδη ο χρήστης, ώστε να δώσουμε
  // κατανοητό μήνυμα αντί για σφάλμα βάσης.
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Το 409 σημαίνει conflict, δηλαδή το αίτημα ήταν σωστό
    // αλλά συγκρούεται με την τρέχουσα κατάσταση.
    return res.status(409).json({ error: "email_taken" });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, name },
    // Το select ορίζει ποια πεδία επιστρέφονται. Χωρίς αυτό
    // θα γύριζε και το passwordHash στην απάντηση.
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const accessToken = signAccessToken(user.id);

  // Το 201 σημαίνει created, δηλαδή δημιουργήθηκε νέος πόρος.
  return res.status(201).json({ user, accessToken });
});

export default router;
