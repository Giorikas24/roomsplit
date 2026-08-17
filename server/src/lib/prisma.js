import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Ο adapter είναι η γέφυρα ανάμεσα στο Prisma και στον
// οδηγό pg που μιλάει πραγματικά με την PostgreSQL.
// Στην έκδοση 7 ο client δεν έχει δικό του μηχανισμό
// σύνδεσης, οπότε πρέπει να του τον δώσουμε ρητά.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Ένα και μοναδικό instance για ολόκληρη την εφαρμογή.
// Αν φτιάχναμε καινούργιο σε κάθε αρχείο, θα ανοίγαμε
// δεκάδες παράλληλες συνδέσεις και η βάση θα άρχιζε
// να τις απορρίπτει.
export const prisma = new PrismaClient({ adapter });
