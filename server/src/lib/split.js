// Μοιράζει ένα ποσό σε λεπτά ανάμεσα σε χρήστες, ίσα.
// Επιστρέφει πίνακα με ένα αντικείμενο ανά συμμετέχοντα.
export function splitEqually(amountCents, userIds) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }

  if (userIds.length === 0) {
    throw new Error("at least one participant is required");
  }

  const count = userIds.length;

  // Ακέραια διαίρεση. Το Math.floor κόβει τα δεκαδικά
  // προς τα κάτω, οπότε το base είναι πάντα το ασφαλές
  // ελάχιστο που δικαιούται ο καθένας.
  const base = Math.floor(amountCents / count);

  // Το % είναι το υπόλοιπο της διαίρεσης, δηλαδή πόσα
  // λεπτά περισσεύουν. Είναι πάντα μικρότερο από το count.
  const remainder = amountCents % count;

  // Ταξινομούμε τα ids ώστε η σειρά να μην εξαρτάται από
  // το πώς τα έστειλε ο client. Έτσι το ίδιο έξοδο δίνει
  // πάντα ακριβώς το ίδιο αποτέλεσμα.
  const sorted = [...userIds].sort();

  return sorted.map((userId, index) => ({
    userId,
    // Οι πρώτοι remainder στη σειρά παίρνουν ένα λεπτό
    // παραπάνω. Το άθροισμα βγαίνει πάντα ακριβώς ίσο
    // με το amountCents.
    amountCents: base + (index < remainder ? 1 : 0),
  }));
}
