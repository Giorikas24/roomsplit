import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  // Πού βρίσκεται το schema με τα μοντέλα
  schema: "prisma/schema.prisma",

  // Πού αποθηκεύονται τα αρχεία migration
  migrations: {
    path: "prisma/migrations",
  },

  // Η σύνδεση που χρησιμοποιεί το CLI για migrations
  datasource: {
    url: env("DATABASE_URL"),
  },
});
