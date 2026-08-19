import express from "express";
import { prisma } from "../lib/prisma.js";
import { createGroupSchema } from "../schemas/group.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireMember } from "../middleware/requireMember.js";

const router = express.Router();

// Εφαρμόζεται σε κάθε διαδρομή αυτού του router.
// Δεν υπάρχει endpoint για groups που να μη θέλει login,
// οπότε το δηλώνουμε μία φορά εδώ αντί για κάθε γραμμή.
router.use(requireAuth);

router.post("/", async (req, res) => {
  const parsed = createGroupSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  // Nested create: φτιάχνει group και membership μαζί.
  // Το Prisma τα τυλίγει σε ένα transaction, οπότε είναι
  // αδύνατο να μείνει group χωρίς κανένα μέλος.
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
  // Ξεκινάμε από τα memberships και όχι από τα groups,
  // γιατί έτσι το φιλτράρισμα ανά χρήστη γίνεται στη βάση
  // και δεν φέρνουμε ποτέ ξένα δεδομένα στη μνήμη.
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
          // Μετράει μέλη χωρίς να τα φέρει όλα.
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  // Ισοπεδώνουμε τη δομή, ώστε ο client να παίρνει λίστα
  // από groups και όχι λίστα από memberships.
  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    createdAt: m.group.createdAt,
    memberCount: m.group._count.members,
    role: m.role,
  }));

  return res.json({ groups });
});

router.get("/:groupId", requireMember, async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.groupId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      members: {
        // Δεν δείχνουμε όσους έχουν φύγει.
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

export default router;