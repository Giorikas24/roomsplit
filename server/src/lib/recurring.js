import { prisma } from "./prisma.js";
import { dueOccurrences } from "./recurrence.js";
import { splitEqually } from "./split.js";

// Δημιουργεί τα έξοδα που οφείλουν οι πάγιοι κανόνες
// του group. Είναι ασφαλές να κληθεί όσες φορές θέλουμε.
export async function generateDueExpenses(groupId) {
  const rules = await prisma.recurringRule.findMany({
    where: { groupId, active: true },
    select: {
      id: true,
      description: true,
      amountCents: true,
      dayOfMonth: true,
      paidById: true,
      createdAt: true,
      lastGeneratedAt: true,
      participants: { select: { userId: true } },
    },
  });

  if (rules.length === 0) {
    return 0;
  }

  // Ποιοι είναι ακόμα στο σπίτι. Ένας κανόνας μπορεί να
  // αναφέρεται σε άτομο που έφυγε στο μεταξύ.
  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { userId: true },
  });

  const active = new Set(members.map((m) => m.userId));

  const now = new Date();
  let created = 0;

  for (const rule of rules) {
    const occurrences = dueOccurrences(rule, now);

    if (occurrences.length === 0) {
      continue;
    }

    // Αν αυτός που πληρώνει έφυγε, ο κανόνας δεν έχει
    // νόημα. Τον προσπερνάμε αντί να παράγουμε έξοδο
    // που δεν μπορεί να χρεωθεί σε κανέναν.
    if (!active.has(rule.paidById)) {
      continue;
    }

    const participantIds = rule.participants
      .map((p) => p.userId)
      .filter((id) => active.has(id));

    if (participantIds.length === 0) {
      continue;
    }

    const last = occurrences[occurrences.length - 1];

    // Interactive transaction. Το πρώτο βήμα είναι να
    // "κλειδώσουμε" τον κανόνα ενημερώνοντας το
    // lastGeneratedAt μόνο αν έχει ακόμα την τιμή που
    // διαβάσαμε. Αν δύο αιτήματα τρέξουν ταυτόχρονα,
    // μόνο το ένα θα βρει την παλιά τιμή και το άλλο
    // θα ακυρωθεί, οπότε δεν παράγονται διπλά έξοδα.
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.recurringRule.updateMany({
        where: { id: rule.id, lastGeneratedAt: rule.lastGeneratedAt },
        data: { lastGeneratedAt: last },
      });

      if (claimed.count === 0) {
        return;
      }

      for (const date of occurrences) {
        // Όταν ο κανόνας δεν έχει σταθερό ποσό, π.χ. ρεύμα,
        // δημιουργούμε εκκρεμές έξοδο με μηδέν και χωρίς
        // shares. Τα pending αγνοούνται στα υπόλοιπα, οπότε
        // δεν χαλάνε τίποτα μέχρι να συμπληρωθεί το ποσό.
        const isPending = rule.amountCents === null;

        await tx.expense.create({
          data: {
            groupId,
            description: rule.description,
            amountCents: isPending ? 0 : rule.amountCents,
            date,
            paidById: rule.paidById,
            isPending,
            recurringRuleId: rule.id,
            shares: isPending
              ? undefined
              : { create: splitEqually(rule.amountCents, participantIds) },
          },
        });

        created += 1;
      }
    });
  }

  return created;
}