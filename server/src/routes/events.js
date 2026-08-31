import express from "express";
import { verifyStreamTicket } from "../lib/tokens.js";
import { requireMember } from "../middleware/requireMember.js";
import { subscribe } from "../lib/events.js";

// Το mergeParams δίνει πρόσβαση στο :groupId που ορίζεται
// στο app.js. Χωρίς αυτό, το requireMember δεν θα έβρισκε
// σε ποιο σπίτι αναφερόμαστε.
const router = express.Router({ mergeParams: true });

// Ξεχωριστός έλεγχος ταυτότητας, γιατί ο browser ανοίγει
// SSE με το EventSource, το οποίο δεν στέλνει headers.
// Διαβάζουμε το εισιτήριο από τη διεύθυνση και ορίζουμε
// το req.userId, ώστε το requireMember που ακολουθεί να
// δουλέψει ακριβώς όπως σε κάθε άλλο endpoint.
function requireTicket(req, res, next) {
  const ticket = req.query.ticket;

  if (!ticket) {
    return res.status(401).json({ error: "missing_ticket" });
  }

  try {
    const payload = verifyStreamTicket(ticket);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_ticket" });
  }
}

// Η σειρά είναι δεσμευτική. Πρώτα ποιος είσαι, μετά αν
// ανήκεις στο σπίτι.
router.use(requireTicket, requireMember);

router.get("/", async (req, res) => {
  // Οι τρεις πρώτοι headers είναι το πρωτόκολλο SSE. Ο
  // τέταρτος λέει σε ενδιάμεσους proxy να μη μαζεύουν την
  // απάντηση σε buffer, γιατί τότε δεν φτάνει τίποτα στον
  // browser μέχρι να κλείσει η σύνδεση.
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Γραμμή που ξεκινάει με άνω κάτω τελεία είναι σχόλιο
  // στο SSE. Τη στέλνουμε αμέσως, ώστε ο browser να δει
  // ότι η σύνδεση άνοιξε.
  res.write(": connected\n\n");

  const unsubscribe = subscribe(req.params.groupId, res);

  // Παλμός κάθε 25 δευτερόλεπτα. Χωρίς αυτόν, proxies και
  // firewalls κλείνουν τις αδρανείς συνδέσεις μετά από
  // περίπου ένα λεπτό.
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 25000);

  // Καθάρισμα όταν κλείσει ο client την καρτέλα. Χωρίς
  // αυτό, κάθε καρτέλα που φεύγει θα άφηνε πίσω της έναν
  // χρονομετρητή και μια εγγραφή στο Map, δηλαδή διαρροή
  // μνήμης που μεγαλώνει με τον χρόνο.
  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;