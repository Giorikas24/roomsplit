import { z } from "zod";

export const registerSchema = z.object({
  email: z.email().trim().toLowerCase(),
  // Το 8 είναι το ελάχιστο. Το μήκος προστατεύει πολύ
  // περισσότερο από κανόνες τύπου "ένα κεφαλαίο, ένα σύμβολο",
  // οι οποίοι κυρίως ενοχλούν τον χρήστη.
  password: z.string().min(8, "Ο κωδικός θέλει τουλάχιστον 8 χαρακτήρες"),
  name: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό").max(80),
});
