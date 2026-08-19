import { z } from "zod";

export const recurringSchema = z.object({
  description: z.string().trim().min(1, "Η περιγραφή είναι υποχρεωτική").max(120),

  // Επιτρέπεται να λείπει ή να είναι null, για λογαριασμούς
  // που αλλάζουν κάθε μήνα, όπως το ρεύμα.
  amountCents: z.int().positive().nullable().optional(),

  // Το 31 επιτρέπεται. Σε μήνες που δεν το έχουν, η
  // παραγωγή πέφτει αυτόματα στην τελευταία μέρα.
  dayOfMonth: z.int().min(1).max(31),

  paidById: z.string().optional(),

  participantIds: z.array(z.string()).min(1, "Χρειάζεται τουλάχιστον ένας συμμετέχων"),
});
