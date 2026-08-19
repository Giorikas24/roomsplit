import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Το όνομα είναι υποχρεωτικό").max(60),
});
