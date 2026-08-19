import { z } from "zod";

export const settlementSchema = z.object({
  // Αν λείπει, θεωρούμε ότι πληρώνει αυτός που καταχωρεί.
  fromUserId: z.string().optional(),

  toUserId: z.string().min(1, "Χρειάζεται παραλήπτης"),

  amountCents: z.int().positive("Το ποσό πρέπει να είναι θετικό"),

  note: z.string().trim().max(200).optional(),
});
