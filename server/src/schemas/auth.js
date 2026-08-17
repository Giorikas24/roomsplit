import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες"),
  name: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό").max(80),
});

// Στο login δεν βάζουμε ελάχιστο μήκος. Ο κωδικός είτε
// ταιριάζει είτε όχι. Αν βάζαμε κανόνα, θα λέγαμε έμμεσα
// στον επιτιθέμενο ποια μορφή έχουν οι σωστοί κωδικοί.
export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});
