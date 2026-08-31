// Ποιοι ακούν, ανά group. Το Map κρατάει groupId προς
// σύνολο ανοιχτών συνδέσεων.
const channels = new Map();

// Καταγράφει μια νέα ανοιχτή σύνδεση για ένα group.
export function subscribe(groupId, res) {
  if (!channels.has(groupId)) {
    channels.set(groupId, new Set());
  }

  const listeners = channels.get(groupId);

  listeners.add(res);

  // Επιστρέφουμε συνάρτηση αποχώρησης. Έτσι όποιος καλεί
  // δεν χρειάζεται να θυμάται ούτε το groupId ούτε το res
  // για να καθαρίσει αργότερα.
  return () => {
    listeners.delete(res);

    // Αδειάζουμε και το Map, αλλιώς θα μάζευε μία εγγραφή
    // για κάθε group που άνοιξε ποτέ κάποιος.
    if (listeners.size === 0) {
      channels.delete(groupId);
    }
  };
}

// Ειδοποιεί όσους ακούν ότι κάτι άλλαξε.
export function publish(groupId, type) {
  const listeners = channels.get(groupId);

  if (!listeners) {
    return;
  }

  // Η μορφή του SSE είναι αυστηρή: γραμμή event, γραμμή
  // data, και δύο αλλαγές γραμμής που κλείνουν το μήνυμα.
  const payload = `event: change\ndata: ${JSON.stringify({ type })}\n\n`;

  for (const res of listeners) {
    res.write(payload);
  }
}