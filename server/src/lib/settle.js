// Δέχεται τα υπόλοιπα και επιστρέφει τις μεταφορές που
// τα μηδενίζουν, με όσο το δυνατόν λιγότερες κινήσεις.
export function simplifyDebts(balances) {
  // Αντιγράφουμε πριν πειράξουμε οτιδήποτε, ώστε να μην
  // αλλάξουμε τα δεδομένα του καλούντος.
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.balanceCents - a.balanceCents);

  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.balanceCents - b.balanceCents);

  const transfers = [];

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Το χρέος είναι αρνητικό, οπότε το κάνουμε θετικό
    // για να συγκρίνουμε ποσά.
    const debt = -debtor.balanceCents;

    // Μεταφέρουμε όσο κλείνει τον έναν από τους δύο.
    const amount = Math.min(creditor.balanceCents, debt);

    transfers.push({
      fromUserId: debtor.id,
      fromName: debtor.name,
      toUserId: creditor.id,
      toName: creditor.name,
      amountCents: amount,
    });

    creditor.balanceCents -= amount;
    debtor.balanceCents += amount;

    // Όποιος έφτασε στο μηδέν, βγαίνει. Τουλάχιστον ένας
    // από τους δύο μηδενίζει σε κάθε γύρο, γι' αυτό ο
    // βρόχος τερματίζει πάντα.
    if (creditor.balanceCents === 0) {
      i += 1;
    }

    if (debtor.balanceCents === 0) {
      j += 1;
    }
  }

  return transfers;
}
