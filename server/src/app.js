import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.js";
import groupsRouter from "./routes/groups.js";

export function createApp() {
  const app = express();

  app.use(express.json());

  // Διαβάζει τα cookies και τα βάζει στο req.cookies.
  // Το χρειαζόμαστε για το refresh token στο επόμενο βήμα.
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/health/db", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ database: "ok" });
    } catch (error) {
      res.status(503).json({ database: "error", message: error.message });
    }
  });

  // Όλες οι διαδρομές του authRouter κρεμάνε κάτω από αυτό
  // το πρόθεμα. Το /register γίνεται /api/auth/register.
  app.use("/api/auth", authRouter);
  app.use("/api/groups", groupsRouter);

  // Τελευταίο middleware, με τέσσερα ορίσματα. Ο express
  // αναγνωρίζει από τον αριθμό των ορισμάτων ότι αυτό είναι
  // ο χειριστής σφαλμάτων και το καλεί μόνο όταν κάτι σκάσει.
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
