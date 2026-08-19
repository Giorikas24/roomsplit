// Πόσες μέρες έχει ο μήνας. Η μέρα 0 του επόμενου μήνα
// είναι η τελευταία του τρέχοντος, κόλπο που δουλεύει
// σε κάθε μήνα και σε δίσεκτα έτη.
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

// Η ημερομηνία εμφάνισης για συγκεκριμένο μήνα. Αν ο
// κανόνας λέει 31 και ο μήνας έχει 30, πέφτει στις 30.
function occurrenceFor(year, month, dayOfMonth) {
  const day = Math.min(dayOfMonth, daysInMonth(year, month));

  return new Date(Date.UTC(year, month, day));
}

// Κόβει την ώρα, κρατώντας μόνο ημερομηνία σε UTC.
// Χωρίς αυτό, δύο ημερομηνίες της ίδιας μέρας με
// διαφορετική ώρα θα συγκρίνονταν λάθος.
function toUtcDate(value) {
  const d = new Date(value);

  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
}

// Επιστρέφει τις ημερομηνίες για τις οποίες ο κανόνας
// οφείλει έξοδο, από την τελευταία παραγωγή μέχρι σήμερα.
export function dueOccurrences(rule, today) {
  const limit = toUtcDate(today);
  const createdAt = toUtcDate(rule.createdAt);

  // Ξεκινάμε από τον μήνα της τελευταίας παραγωγής, ή
  // από τον μήνα δημιουργίας αν δεν έχει τρέξει ποτέ.
  const anchor = rule.lastGeneratedAt
    ? toUtcDate(rule.lastGeneratedAt)
    : createdAt;

  let year = anchor.getUTCFullYear();
  let month = anchor.getUTCMonth();

  // Αν έχει ήδη παραχθεί κάτι, ο μήνας εκείνος είναι
  // κλεισμένος, οπότε προχωράμε στον επόμενο.
  if (rule.lastGeneratedAt) {
    month += 1;
  }

  const occurrences = [];

  // Το όριο των 60 επαναλήψεων είναι δικλείδα ασφαλείας.
  // Αν κάτι πάει στραβά στις ημερομηνίες, προτιμάμε να
  // σταματήσει παρά να τρέχει ατέρμονα.
  for (let guard = 0; guard < 60; guard += 1) {
    const occurrence = occurrenceFor(year, month, rule.dayOfMonth);

    // Το getTime δίνει αριθμό, ώστε να συγκρίνουμε
    // ημερομηνίες. Το > ανάμεσα σε αντικείμενα Date
    // δουλεύει, αλλά το === όχι, οπότε είμαστε συνεπείς.
    if (occurrence.getTime() > limit.getTime()) {
      break;
    }

    // Δεν παράγουμε αναδρομικά για ημερομηνίες πριν
    // υπάρξει ο κανόνας.
    if (occurrence.getTime() >= createdAt.getTime()) {
      occurrences.push(occurrence);
    }

    month += 1;

    // Ο Date δέχεται μήνα 12 και τον μεταφράζει σε
    // Ιανουάριο του επόμενου έτους, αλλά το κάνουμε
    // ρητά ώστε να είναι διαβαστό.
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return occurrences;
}
