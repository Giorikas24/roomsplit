import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma.js";
import authRouter from "./routes/auth.js";
import groupsRouter from "./routes/groups.js";
import eventsRouter from "./routes/events.js";

// Σε ES modules δεν υπάρχει το __dirname που ξέρουν όσοι
// έχουν δει παλιό κώδικα Node. Το φτιάχνουμε από το
// import.meta.url, που είναι η διεύθυνση αυτού του αρχείου.
const here = path.dirname(fileURLToPath(import.meta.url));

// Από το server/src ανεβαίνουμε δύο επίπεδα και μπαίνουμε
// στο client/dist, εκεί όπου ο Vite γράφει το build.
const clientDist = path.resolve(here, "..", "..", "client", "dist");

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/health/db", async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ database: "ok" });
    } catch (error) {
      res.status(503).json({ database: "error", message: error.message });
    }
  });

  app.use("/api/auth", authRouter);

  // Πριν από τον groupsRouter, γιατί εκείνος απαιτεί
  // Authorization header που το EventSource δεν στέλνει.
  app.use("/api/groups/:groupId/events", eventsRouter);

  app.use("/api/groups", groupsRouter);

  // Από εδώ και κάτω, μόνο σε παραγωγή. Στην ανάπτυξη τον
  // client τον σερβίρει ο Vite, οπότε δεν υπάρχει φάκελος
  // dist και δεν θέλουμε να ψάχνει.
  if (process.env.NODE_ENV === "production") {
    // Τα αρχεία με hash στο όνομα, δηλαδή js και css,
    // μπορούν να αποθηκευτούν για πάντα, γιατί αν αλλάξει
    // το περιεχόμενο αλλάζει και το όνομα.
    app.use(express.static(clientDist, { index: false }));

    // Ό,τι δεν ταίριαξε παραπάνω επιστρέφει το index.html.
    // Χρειάζεται επειδή ο router του React ζει στον browser:
    // αν κάποιος φορτώσει κατευθείαν το /groups/abc, ο server
    // δεν έχει τέτοια διαδρομή και θα έδινε 404.
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}