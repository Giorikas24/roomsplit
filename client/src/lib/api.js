// Το access token ζει μόνο στη μνήμη, σε μεταβλητή αυτού
// του αρχείου. Δεν το βάζουμε σε localStorage, γιατί εκεί
// το διαβάζει οποιοσδήποτε κώδικας τρέξει στη σελίδα.
// Σε refresh της σελίδας χάνεται, αλλά το ανακτάμε από το
// refresh cookie, που είναι httpOnly και άρα απρόσιτο.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Δικός μας τύπος σφάλματος, ώστε οι οθόνες να μπορούν να
// δουν τον κωδικό απάντησης και το σώμα, αντί για σκέτο
// κείμενο.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error ?? `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function parse(response) {
  // Το 204 δεν έχει σώμα, οπότε το json() θα έσκαγε.
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

async function request(path, options = {}) {
  const headers = { ...options.headers };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return fetch(path, {
    ...options,
    headers,
    // Στέλνει και δέχεται cookies. Χωρίς αυτό, το refresh
    // cookie δεν θα έφτανε ποτέ στον server.
    credentials: "include",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

// Δοκιμάζει να ανανεώσει το access token με το cookie.
// Επιστρέφει τα στοιχεία του χρήστη ή null.
export async function refreshSession() {
  const response = await request("/api/auth/refresh", { method: "POST" });

  if (!response.ok) {
    accessToken = null;
    return null;
  }

  const data = await parse(response);

  accessToken = data.accessToken;

  return data.user;
}

// Η κύρια συνάρτηση που χρησιμοποιούν οι οθόνες.
export async function apiFetch(path, options = {}) {
  let response = await request(path, options);

  // Αν το token έληξε, δοκιμάζουμε μία ανανέωση και
  // επαναλαμβάνουμε. Μόνο μία φορά, ώστε να μην μπούμε
  // σε ατέρμονο κύκλο αν αποτύχει και η ανανέωση.
  if (response.status === 401 && !path.startsWith("/api/auth/refresh")) {
    const user = await refreshSession();

    if (user) {
      response = await request(path, options);
    }
  }

  const data = await parse(response);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data;
}