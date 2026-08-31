import { useEffect, useRef } from "react";
import { apiFetch } from "./api.js";

// Ακούει τη ροή του group και καλεί το onChange σε κάθε
// αλλαγή. Ο καλών αποφασίζει τι θα κάνει, εμείς απλώς
// λέμε ότι κάτι συνέβη.
export function useGroupEvents(groupId, onChange) {
  // Το onChange είναι καινούργια συνάρτηση σε κάθε σχεδίαση.
  // Αν το βάζαμε στις εξαρτήσεις του useEffect, θα κλείναμε
  // και θα ανοίγαμε τη σύνδεση συνεχώς. Το κρατάμε σε ref,
  // που είναι κουτί με τιμή που αλλάζει χωρίς επανασχεδίαση.
  const handlerRef = useRef(onChange);

  handlerRef.current = onChange;

  useEffect(() => {
    let source = null;
    let retryTimer = null;

    // Σημαία που δείχνει ότι το component έφυγε. Χωρίς
    // αυτήν, μια σύνδεση που ξεκίνησε πριν την αποχώρηση
    // θα άνοιγε αφού το component δεν υπάρχει πια.
    let cancelled = false;

    async function connect() {
      try {
        // Το εισιτήριο ζητείται με κανονικό αίτημα, δηλαδή
        // με Authorization header. Μόνο το άνοιγμα της ροής
        // γίνεται με παράμετρο στη διεύθυνση.
        const data = await apiFetch("/api/auth/stream-ticket", {
          method: "POST",
        });

        if (cancelled) {
          return;
        }

        // Το encodeURIComponent προστατεύει από χαρακτήρες
        // που έχουν ειδική σημασία σε διεύθυνση.
        source = new EventSource(
          `/api/groups/${groupId}/events?ticket=${encodeURIComponent(data.ticket)}`
        );

        // Ακούμε συγκεκριμένα το event change, που είναι το
        // όνομα που στέλνει ο server. Τα σχόλια του παλμού
        // δεν φτάνουν ποτέ εδώ.
        source.addEventListener("change", () => {
          handlerRef.current();
        });

        source.onerror = () => {
          // Το EventSource ξαναπροσπαθεί μόνο του, αλλά θα
          // ξαναχρησιμοποιούσε το ίδιο εισιτήριο, που έχει
          // ήδη λήξει. Γι' αυτό κλείνουμε και ξεκινάμε από
          // την αρχή με φρέσκο εισιτήριο.
          source.close();
          source = null;

          if (!cancelled) {
            retryTimer = setTimeout(connect, 3000);
          }
        };
      } catch {
        // Αν αποτύχει η έκδοση εισιτηρίου, π.χ. πεσμένο
        // δίκτυο, ξαναδοκιμάζουμε αργότερα. Η εφαρμογή
        // συνεχίζει να δουλεύει, απλώς χωρίς ζωντανή
        // ενημέρωση μέχρι να επανέλθει.
        if (!cancelled) {
          retryTimer = setTimeout(connect, 5000);
        }
      }
    }

    connect();

    // Η επιστρεφόμενη συνάρτηση τρέχει όταν φεύγει το
    // component ή αλλάζει το groupId. Χωρίς αυτήν, κάθε
    // μετάβαση σε άλλο σπίτι θα άφηνε πίσω της ανοιχτή
    // σύνδεση.
    return () => {
      cancelled = true;
      clearTimeout(retryTimer);

      if (source) {
        source.close();
      }
    };
  }, [groupId]);
}