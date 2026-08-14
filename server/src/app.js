import express from "express";

// Η createApp φτιάχνει και επιστρέφει την εφαρμογή,
// αλλά δεν την ξεκινάει. Το ξεχωρίζουμε επίτηδες,
// ώστε αργότερα τα tests να μπορούν να τη φορτώσουν
// χωρίς να ανοίγει πραγματική πόρτα στο δίκτυο.
export function createApp() {
  const app = express();

  // Middleware: διαβάζει το σώμα των αιτημάτων όταν είναι JSON
  // και το βάζει έτοιμο στο req.body. Χωρίς αυτό, το req.body
  // θα ήταν undefined σε κάθε POST.
  app.use(express.json());

  // Endpoint ελέγχου. Δεν αγγίζει βάση, δεν θέλει login.
  // Χρησιμεύει για να επιβεβαιώνουμε ότι ο server ζει.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
}
