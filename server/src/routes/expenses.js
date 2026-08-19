import express from "express";
import { prisma } from "../lib/prisma.js";
import { splitEqually } from "../lib/split.js";
import { expenseSchema } from "../schemas/expense.js";

// Το mergeParams είναι κρίσιμο. Χωρίς αυτό ο router δεν
// βλέπει το :groupId του γονικού router και το
// req.params.groupId θα ήταν undefined.
const router = express.Router({ mergeParams: true });

// Τα ids των ενεργών μελών, ως Set για γρήγορο έλεγχο.
async function activeMemberIds(groupId) {
  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { userId: true },
  });

  return new Set(members.map((m) => m.userId));
}

// Κοινός έλεγχος για create και update. Επιστρέφει το
// όνομα του προβλήματος, ή null αν όλα είναι εντάξει.
async function validateParticipants(groupId, paidById, participantIds) {
  const allowed = await activeMemberIds(groupId);

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

// Ορίζεται μία φορά, ώστε create, list και update να
// επιστρέφουν πάντα ακριβώς την ίδια δομή.
const expenseSelect = {
  id: true,
  description: true,
  amountCents: true,
  date: true,
  isPending: true,
  paidBy: { select: { id: true, name: true } },
  shares: {
    select: {
      amountCents: true,
      user: { select: { id: true, name: true } },
    },
  },
};

function toResponse(expense) {
  return {
    id: expense.id,
    description: expense.description,
    amountCents: expense.amountCents,
    date: expense.date,
    isPending: expense.isPending,
    paidBy: expense.paidBy,
    shares: expense.shares.map((s) => ({
      userId: s.user.id,
      name: s.user.name,
      amountCents: s.amountCents,
    })),
  };
}

router.post("/", async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const groupId = req.params.groupId;
  const { description, amountCents, date, participantIds } = parsed.data;

  // Το ?? δίνει το δεξί μέρος μόνο αν το αριστερό είναι
  // null ή undefined. Διαφέρει από το ||, που θα έπιανε
  // και το κενό κείμενο.
  const paidById = parsed.data.paidById ?? req.userId;

  const problem = await validateParticipants(groupId, paidById, participantIds);

  if (problem) {
    return res.status(400).json({ error: problem });
  }

  const shares = splitEqually(amountCents, participantIds);

  const expense = await prisma.expense.create({
    data: {
      groupId,
      description,
      amountCents,
      date: new Date(date),
      paidById,
      // Nested create: τα shares γράφονται μαζί με το έξοδο
      // σε ένα transaction. Είναι αδύνατο να μείνει έξοδο
      // χωρίς μοίρασμα.
      shares: { create: shares },
    },
    select: expenseSelect,
  });

  return res.status(201).json({ expense: toResponse(expense) });
});

router.get("/", async (req, res) => {
  const expenses = await prisma.expense.findMany({
    where: { groupId: req.params.groupId },
    select: expenseSelect,
    // Το createdAt ως δεύτερο κριτήριο δίνει σταθερή σειρά
    // όταν δύο έξοδα έχουν την ίδια ημερομηνία.
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return res.json({ expenses: expenses.map(toResponse) });
});

router.put("/:expenseId", async (req, res) => {
  const parsed = expenseSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
  }

  const groupId = req.params.groupId;

  // Ελέγχουμε ότι το έξοδο ανήκει σε αυτό το group. Χωρίς
  // αυτό, μέλος του σπιτιού Α θα μπορούσε να αλλάξει έξοδο
  // του σπιτιού Β στέλνοντας το id του.
  const existing = await prisma.expense.findFirst({
    where: { id: req.params.expenseId, groupId },
    select: { id: true },
  });

  if (!existing) {
    return res.status(404).json({ error: "expense_not_found" });
  }

  const { description, amountCents, date, participantIds } = parsed.data;
  const paidById = parsed.data.paidById ?? req.userId;

  const problem = await validateParticipants(groupId, paidById, participantIds);

  if (problem) {
    return res.status(400).json({ error: problem });
  }

  const shares = splitEqually(amountCents, participantIds);

  // Σβήνουμε τα παλιά shares και γράφουμε καινούργια, γιατί
  // μπορεί να άλλαξαν και οι ίδιοι οι συμμετέχοντες.
  const [, expense] = await prisma.$transaction([
    prisma.expenseShare.deleteMany({ where: { expenseId: existing.id } }),
    prisma.expense.update({
      where: { id: existing.id },
      data: {
        description,
        amountCents,
        date: new Date(date),
        paidById,
        isPending: false,
        shares: { create: shares },
      },
      select: expenseSelect,
    }),
  ]);

  return res.json({ expense: toResponse(expense) });
});

router.delete("/:expenseId", async (req, res) => {
  // Το deleteMany δέχεται φίλτρο με πολλά πεδία, ενώ το
  // delete θέλει μοναδικό κλειδί. Έτσι ελέγχουμε ταυτόχρονα
  // id και groupId σε μία κίνηση.
  const result = await prisma.expense.deleteMany({
    where: { id: req.params.expenseId, groupId: req.params.groupId },
  });

  if (result.count === 0) {
    return res.status(404).json({ error: "expense_not_found" });
  }

  // Τα shares σβήνονται μόνα τους λόγω του onDelete Cascade.
  return res.status(204).end();
});

export default router;