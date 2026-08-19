import crypto from "node:crypto";
import express from "express";
import { prisma } from "../lib/prisma.js";
import { createGroupSchema } from "../schemas/group.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireMember } from "../middleware/requireMember.js";
import expensesRouter from "./expenses.js";
import balancesRouter from "./balances.js";

const router = express.Router();

router.use(requireAuth);

// Ολα τα expenses endpoints περνάνε πρώτα από τον έλεγχο
// μέλους, οπότε δεν χρειάζεται να τον επαναλάβουμε μέσα.
router.use("/:groupId/expenses", requireMember, expensesRouter);
router.use("/:groupId/balances", requireMember, balancesRouter);

// Πόσο ζει μια πρόσκληση, σε χιλιοστά του δευτερολέπτου.
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

router.post("/", async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      members: {
        create: { userId: req.userId, role: "OWNER" },
      },
    },
    select: { id: true, name: true, createdAt: true },
  });

  return res.status(201).json({ group });
});

router.get("/", async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.userId, leftAt: null },
    select: {
      role: true,
      joinedAt: true,
      group: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    createdAt: m.group.createdAt,
    memberCount: m.group._count.members,
    role: m.role,
  }));

  return res.json({ groups });
});

// Οι διαδρομές /join μπαίνουν πριν από την /:groupId.
// Δεν συγκρούονται, γιατί έχουν διαφορετικό αριθμό
// τμημάτων, αλλά η σειρά κάνει τον κώδικα πιο ξεκάθαρο.
router.get("/join/:token", async (req, res) => {
  const invite = await prisma.invite.findUnique({
    where: { token: req.params.token },
    select: {
      expiresAt: true,
      usedAt: true,
      group: { select: { id: true, name: true } },
    },
  });

  // Ίδια απάντηση για ανύπαρκτη, χρησιμοποιημένη και
  // ληγμένη πρόσκληση. Δεν δίνουμε πληροφορία σε κάποιον
  // που δοκιμάζει τυχαία tokens.
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: "invite_invalid" });
  }

  // Μόνο το όνομα του σπιτιού, τίποτα άλλο. Αυτός που
  // βλέπει την πρόσκληση δεν είναι ακόμα μέλος.
  return res.json({ group: invite.group });
});

router.post("/join/:token", async (req, res) => {
  const invite = await prisma.invite.findUnique({
    where: { token: req.params.token },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return res.status(404).json({ error: "invite_invalid" });
  }

  const existing = await prisma.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: invite.groupId, userId: req.userId },
    },
  });

  if (existing && !existing.leftAt) {
    return res.status(409).json({ error: "already_member" });
  }

  // Το transaction εγγυάται ότι είτε γίνονται και τα δύο,
  // είτε κανένα. Χωρίς αυτό, μια αποτυχία στη μέση θα
  // άφηνε πρόσκληση καμένη χωρίς να έχει μπει ο χρήστης.
  await prisma.$transaction([
    existing
      ? // Επιστροφή παλιού συγκατοίκου: καθαρίζουμε το leftAt
        // αντί να φτιάξουμε δεύτερη εγγραφή, ώστε να μη
        // σπάσει το ιστορικό των εξόδων του.
        prisma.groupMember.update({
          where: { id: existing.id },
          data: { leftAt: null, joinedAt: new Date() },
        })
      : prisma.groupMember.create({
          data: { groupId: invite.groupId, userId: req.userId },
        }),
    prisma.invite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const group = await prisma.group.findUnique({
    where: { id: invite.groupId },
    select: { id: true, name: true, createdAt: true },
  });

  return res.status(201).json({ group });
});

router.get("/:groupId", requireMember, async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.groupId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      members: {
        where: { leftAt: null },
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  const members = group.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.joinedAt,
  }));

  return res.json({
    group: {
      id: group.id,
      name: group.name,
      createdAt: group.createdAt,
      members,
    },
  });
});

router.post("/:groupId/invites", requireMember, async (req, res) => {
  const invite = await prisma.invite.create({
    data: {
      groupId: req.params.groupId,
      // 32 τυχαία bytes. Το base64url δίνει κείμενο που
      // μπαίνει σε URL χωρίς να χρειάζεται μετατροπή,
      // δηλαδή χωρίς +, / και =.
      token: crypto.randomBytes(32).toString("base64url"),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    select: { token: true, expiresAt: true },
  });

  return res.status(201).json({ invite });
});

export default router;