import express from "express";
import { prisma } from "../lib/prisma.js";
import { computeBalances } from "../lib/balances.js";
import { simplifyDebts } from "../lib/settle.js";
import { settlementSchema } from "../schemas/settlement.js";
import { publish } from "../lib/events.js";

const router = express.Router({ mergeParams: true });

// Προτεινόμενες μεταφορές. Δεν γράφει τίποτα στη βάση,
// είναι καθαρά υπολογισμός πάνω στα τρέχοντα υπόλοιπα.
router.get("/suggested", async (req, res) => {
  const balances = await computeBalances(req.params.groupId);
  const transfers = simplifyDebts(balances);

  return res.json({ transfers });
});

// Ιστορικό εξοφλήσεων.
router.get("/", async (req, res) => {
  const settlements = await prisma.settlement.findMany({
    where: { groupId: req.params.groupId },
    select: {
      id: true,
      amountCents: true,
      settledAt: true,
      note: true,
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } },
    },
    orderBy: { settledAt: "desc" },
  });

  return res.json({ settlements });
});

// Καταγραφή εξόφλησης.
router.post("/", async (req, res) => {
  const parsed = settlementSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const groupId = req.params.groupId;
  const { toUserId, amountCents, note } = parsed.data;
  const fromUserId = parsed.data.fromUserId ?? req.userId;

  // Δεν έχει νόημα να πληρώσει κάποιος τον εαυτό του,
  // και θα άφηνε εγγραφή που δεν αλλάζει τίποτα.
  if (fromUserId === toUserId) {
    return res.status(400).json({ error: "same_user" });
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null, userId: { in: [fromUserId, toUserId] } },
    select: { userId: true },
  });

  // Πρέπει να βρεθούν και οι δύο. Αν λείπει έστω ένας,
  // κάποιος από τους δύο δεν είναι ενεργό μέλος.
  if (members.length !== 2) {
    return res.status(400).json({ error: "not_group_members" });
  }

  const settlement = await prisma.settlement.create({
    data: { groupId, fromUserId, toUserId, amountCents, note },
    select: {
      id: true,
      amountCents: true,
      settledAt: true,
      note: true,
      from: { select: { id: true, name: true } },
      to: { select: { id: true, name: true } },
    },
  });

  publish(groupId, "settlement");

  return res.status(201).json({ settlement });
});

// Ακύρωση εξόφλησης, για την περίπτωση λάθους καταχώρησης.
router.delete("/:settlementId", async (req, res) => {
  const result = await prisma.settlement.deleteMany({
    where: { id: req.params.settlementId, groupId: req.params.groupId },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "settlement_not_found" });
  }

  publish(req.params.groupId, "settlement");

  return res.status(204).end();
});

export default router;