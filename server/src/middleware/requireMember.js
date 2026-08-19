import { prisma } from "../lib/prisma.js";

// Τρέχει μετά το requireAuth, οπότε το req.userId υπάρχει ήδη.
// Ελέγχει ότι ο συνδεδεμένος χρήστης είναι ενεργό μέλος
// του group που ζητάει.
export async function requireMember(req, res, next) {
  const groupId = req.params.groupId;

  const membership = await prisma.groupMember.findUnique({
    // Το όνομα του σύνθετου κλειδιού το φτιάχνει το Prisma
    // ενώνοντας τα πεδία του @@unique με κάτω παύλα.
    where: { groupId_userId: { groupId, userId: req.userId } },
  });

  // Το leftAt σημαίνει ότι έφυγε από το σπίτι.
  if (!membership || membership.leftAt) {
    // Επιστρέφουμε 404 και όχι 403. Το 403 θα επιβεβαίωνε
    // ότι το group υπάρχει, που είναι πληροφορία που δεν
    // δικαιούται κάποιος τρίτος.
    return res.status(404).json({ error: "group_not_found" });
  }

  // Το κρεμάμε στο req ώστε τα endpoints να ξέρουν αν ο
  // χρήστης είναι OWNER, χωρίς δεύτερο query.
  req.membership = membership;
  next();
}
