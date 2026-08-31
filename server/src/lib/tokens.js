import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const ACCESS_TTL = "15m";
const REFRESH_TTL = "7d";

// Το εισιτήριο ζει ένα λεπτό. Αρκεί για να ανοίξει η ροή
// αμέσως μετά την έκδοσή του, και είναι πολύ λίγο για να
// αξίζει σε κάποιον που θα το έβρισκε σε κάποιο log.
const STREAM_TTL = "60s";

// Κοινή συνάρτηση υπογραφής. Το typ ξεχωρίζει τα είδη:
// χωρίς αυτό, ένα εισιτήριο ροής θα μπορούσε να περάσει
// ως κανονικό access token, αφού υπογράφονται με το ίδιο
// μυστικό.
function sign(secret, userId, typ, expiresIn) {
  return jwt.sign({ sub: userId, typ, jti: crypto.randomUUID() }, secret, {
    expiresIn,
  });
}

export function signAccessToken(userId) {
  return sign(process.env.JWT_ACCESS_SECRET, userId, "access", ACCESS_TTL);
}

export function signRefreshToken(userId) {
  return sign(process.env.JWT_REFRESH_SECRET, userId, "refresh", REFRESH_TTL);
}

export function signStreamTicket(userId) {
  return sign(process.env.JWT_ACCESS_SECRET, userId, "stream", STREAM_TTL);
}

// Επαληθεύει και ελέγχει ότι το είδος είναι το αναμενόμενο.
// Ρίχνει σφάλμα σε κάθε πρόβλημα, ώστε να αποφασίσει ο
// καλών τι κωδικό απάντησης θα στείλει.
function verify(secret, token, expectedTyp) {
  const payload = jwt.verify(token, secret);

  if (payload.typ !== expectedTyp) {
    throw new Error("wrong token type");
  }

  return payload;
}

export function verifyAccessToken(token) {
  return verify(process.env.JWT_ACCESS_SECRET, token, "access");
}

export function verifyRefreshToken(token) {
  return verify(process.env.JWT_REFRESH_SECRET, token, "refresh");
}

export function verifyStreamTicket(token) {
  return verify(process.env.JWT_ACCESS_SECRET, token, "stream");
}