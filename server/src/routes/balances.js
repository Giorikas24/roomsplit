import express from "express";
import { computeBalances } from "../lib/balances.js";

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const balances = await computeBalances(req.params.groupId);

  // Το άθροισμα πρέπει πάντα να είναι μηδέν. Το στέλνουμε
  // κι εμείς, ώστε ο client να μπορεί να το ελέγξει και
  // να φανεί αμέσως αν κάτι χάλασε.
  const checksum = balances.reduce((sum, b) => sum + b.balanceCents, 0);

  return res.json({ balances, checksum });
});

export default router;
