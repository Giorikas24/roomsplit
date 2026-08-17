import express from "express";
import { prisma } from "./lib/prisma.js";

// Η createApp φτιάχνει και επιστρέφει την εφαρμογή,
// αλλά δεν την ξεκινάει. Το ξεχωρίζουμε επίτηδες,
// ώστε αργότερα τα tests να μπορούν να τη φορτώσουν
// χωρίς να ανοίγει πραγματική πόρτα στο δίκτυο.
export function createApp() {
  const app = express();

  // Middleware: διαβάζει το σώμα των αιτημάτων όταν είναι JSON
  // και το βάζει έτοιμο στο req.body.
  app.use(express.json());

  // Ελέγχει ότι ζει ο server. Δεν αγγίζει βάση,
  // οπότε απαντάει πάντα και αμέσως.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Ελέγχει ότι ο server μπορεί όντως να μιλήσει στη βάση.
  // Το async μπροστά στη συνάρτηση χρειάζεται γιατί το query
  // παίρνει χρόνο και πρέπει να το περιμένουμε με await.
  app.get("/api/health/db", async (req, res) => {
    try {
      // Το πιο φθηνό δυνατό query. Δεν διαβάζει πίνακες,
      // απλώς επιβεβαιώνει ότι η σύνδεση απαντάει.
      await prisma.$queryRaw`SELECT 1`;
      res.json({ database: "ok" });
    } catch (error) {
      // Το 503 σημαίνει service unavailable, δηλαδή ο server
      // υπάρχει αλλά κάτι από όσα χρειάζεται δεν λειτουργεί.
      res.status(503).json({ database: "error", message: error.message });
    }
  });

  return app;
}
