import express from "express";
import { prisma } from "../lib/prisma.js";
import { recurringSchema } from "../schemas/recurring.js";

const router = express.Router({ mergeParams: true });

const ruleSelect = {
  id: true,
  description: true,
  amountCents: true,
  dayOfMonth: true,
  active: true,
  lastGeneratedAt: true,
  paidBy: { select: { id: true, name: true } },
  participants: {
    select: { user: { select: { id: true, name: true } } },
  },
};

function toResponse(rule) {
  return {
    id: rule.id,
    description: rule.description,
    amountCents: rule.amountCents,
    dayOfMonth: rule.dayOfMonth,
    active: rule.active,
    lastGeneratedAt: rule.lastGeneratedAt,
    paidBy: rule.paidBy,
    participants: rule.participants.map((p) => p.user),
  };
}

// Επιβεβαιώνει ότι όλοι οι εμπλεκόμενοι είναι ενεργά μέλη.
async function validate(groupId, paidById, participantIds) {
  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { userId: true },
  });

  const allowed = new Set(members.map((m) => m.userId));

  if (!allowed.has(paidById)) {
    return "payer_not_member";
  }

  const unique = new Set(participantIds);

  if (unique.size !== participantIds.length) {
    return "duplicate_participants";
  }

  for (const id of unique) {
    if (!allowed.has(id)) {
      return "participant_not_member";
    }
  }

  return null;
}

router.get("/", async (req, res) => {
  const rules = await prisma.recurringRule.findMany({
    where: { groupId: req.params.groupId },
    select: ruleSelect,
    orderBy: { createdAt: "asc" },
  });

  return res.json({ rules: rules.map(toResponse) });
});

router.post("/", async (req, res) => {
  const parsed = recurringSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const groupId = req.params.groupId;
  const { description, dayOfMonth, participantIds } = parsed.data;
  const paidById = parsed.data.paidById ?? req.userId;

  // Το ?? null μετατρέπει το undefined σε ρητό null, που
  // είναι αυτό που περιμένει η βάση για κενό πεδίο.
  const amountCents = parsed.data.amountCents ?? null;

  const problem = await validate(groupId, paidById, participantIds);

  if (problem) {
    return res.status(400).json({ error: problem });
  }

  const rule = await prisma.recurringRule.create({
    data: {
      groupId,
      description,
      amountCents,
      dayOfMonth,
      paidById,
      participants: {
        create: participantIds.map((userId) => ({ userId })),
      },
    },
    select: ruleSelect,
  });

  return res.status(201).json({ rule: toResponse(rule) });
});

// Απενεργοποίηση αντί για διαγραφή. Ο κανόνας σταματάει
// να παράγει, αλλά τα έξοδα που έφτιαξε παραμένουν
// συνδεδεμένα και το ιστορικό δεν χάνεται.
router.patch("/:ruleId/deactivate", async (req, res) => {
  const result = await prisma.recurringRule.updateMany({
    where: { id: req.params.ruleId, groupId: req.params.groupId },
    data: { active: false },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "rule_not_found" });
  }

  return res.status(204).end();
});

export default router;