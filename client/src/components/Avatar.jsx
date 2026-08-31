import { colorForId, initialsFor } from "../lib/avatar.js";

// Μικρό component χωρίς δική του λογική. Το φτιάχνουμε
// ξεχωριστά επειδή εμφανίζεται σε πέντε διαφορετικά
// σημεία και δεν θέλουμε να επαναλαμβάνουμε τον κώδικα.
export default function Avatar({ id, name, small = false }) {
  return (
    <span
      className={small ? "avatar avatar-sm" : "avatar"}
      style={{ background: colorForId(id) }}
      // Το title δείχνει ολόκληρο το όνομα στο hover, για
      // τις περιπτώσεις που φαίνονται μόνο τα αρχικά.
      title={name}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}