import "dotenv/config";
import { createApp } from "./app.js";

// Διαβάζουμε την πόρτα από το περιβάλλον.
// Αν λείπει, πέφτουμε πίσω στο 4000, ώστε ο server
// να δουλεύει και σε καθαρό μηχάνημα χωρίς ρυθμίσεις.
const port = Number(process.env.PORT) || 4000;

const app = createApp();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
