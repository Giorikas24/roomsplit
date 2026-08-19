import { prisma } from "./prisma.js";

// Υπολογίζει το καθαρό υπόλοιπο κάθε ενεργού μέλους,
// σε λεπτά. Θετικό: του χρωστάνε. Αρνητικό: χρωστάει.
export async function computeBalances(groupId) {
  const members = await prisma.groupMember.findMany({
    where: { groupId, leftAt: null },
    select: { user: { select: { id: true, name: true } } },
  });

  // Ξεκινάμε όλους από το μηδέν. Χωρίς αυτό, όποιος δεν
  // έχει κανένα έξοδο δεν θα εμφανιζόταν καθόλου.
  const balances = new Map();

  for (const m of members) {
    balances.set(m.user.id, { ...m.user, balanceCents: 0 });
  }

  // Βοηθητική: προσθέτει ποσό σε άτομο, αγνοώντας όσους
  // δεν είναι πλέον ενεργά μέλη.
  const add = (userId, amount) => {
    const entry = balances.get(userId);

    if (entry) {
      entry.balanceCents += amount;
    }
  };

  // Τα pending έξοδα δεν έχουν ακόμα πραγματικό ποσό,
  // οπότε δεν πρέπει να επηρεάζουν τα υπόλοιπα.
  const expenses = await prisma.expense.findMany({
    where: { groupId, isPending: false },
    select: {
      amountCents: true,
      paidById: true,
      shares: { select: { userId: true, amountCents: true } },
    },
  });

  for (const expense of expenses) {
    add(expense.paidById, expense.amountCents);

    for (const share of expense.shares) {
      add(share.userId, -share.amountCents);
    }
  }

  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    select: { fromUserId: true, toUserId: true, amountCents: true },
  });

  for (const s of settlements) {
    add(s.fromUserId, s.amountCents);
    add(s.toUserId, -s.amountCents);
  }

  // Ταξινόμηση από τον μεγαλύτερο πιστωτή προς τον
  // μεγαλύτερο χρεώστη, που είναι και η χρήσιμη σειρά
  // για την οθόνη.
  return [...balances.values()].sort(
    (a, b) => b.balanceCents - a.balanceCents
  );
}
