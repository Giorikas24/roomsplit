import { prisma } from "../lib/prisma.js";
import { generateDueExpenses } from "../lib/recurring.js";

export async function requireMember(req, res, next) {
  const groupId = req.params.groupId;

  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: req.userId } },
  });

  if (!membership || membership.leftAt) {
    return res.status(404).json({ error: "group_not_found" });
  }

  req.membership = membership;

  // Παράγουμε τα πάγια που οφείλονται. Το τυλίγουμε σε try
  // ώστε μια αποτυχία εδώ να μη μπλοκάρει το αίτημα: αν
  // κάτι πάει στραβά, ο χρήστης πρέπει να μπορεί να δει τα
  // υπόλοιπα έξοδά του κανονικά.
  try {
    await generateDueExpenses(groupId);
  } catch (error) {
    console.error("recurring generation failed", error);
  }

  next();
}
