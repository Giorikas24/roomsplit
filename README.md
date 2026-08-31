# Roomsplit

Shared expense tracking for flatmates. Log who paid for what, see who owes
whom, and settle up with the fewest possible transfers.

**Live demo:** https://roomsplit-58bj.onrender.com

Demo account: `test@example.com` / `testpassword123`

> The demo runs on a free tier that sleeps after 15 minutes of inactivity.
> The first request may take up to a minute to wake the service.

## The problem

Flatmates split bills constantly and track them badly: group chats, notes
apps, or nothing at all. By the end of the month nobody remembers who paid
for the electricity and everyone owes everyone a little. Roomsplit records
each expense once and reduces the whole tangle to the smallest set of
payments that clears it.

## Features

- Households with multiple members, joined via single-use invite links
- Expenses split equally between any subset of members
- Live balances per person, always derived from source data
- Settle up: the minimum set of transfers that zeroes everyone out
- Recurring expenses generated automatically each month, including
  variable-amount bills that are created as pending and filled in later
- Real-time updates: an expense added by one flatmate appears on everyone
  else's open screen within a second

## Tech stack

React 19 (Vite) · Node.js · Express 5 · PostgreSQL (Neon) · Prisma 7 ·
Server-Sent Events · JWT auth

## Design decisions worth explaining

**Money is stored as integer cents.** Floating point arithmetic loses
precision — `0.1 + 0.2` is not `0.3` — and errors accumulate over hundreds
of expenses. All amounts are integers; conversion to euros happens only at
the display layer.

**Splitting never loses a cent.** Dividing €10.00 three ways gives
€3.33 each, which sums to €9.99. The remainder is distributed one cent at a
time to participants in a deterministic order, so the shares always sum
exactly to the total and the same expense always produces the same split.

**Balances are computed, never stored.** A member's balance is derived on
every request from expenses, shares and settlements. A stored balance would
eventually drift out of sync with an edit or deletion. The API returns a
checksum that must always be zero — a built-in correctness check.

**Debt simplification.** Rather than having every debtor pay every creditor,
the largest creditor is repeatedly matched against the largest debtor. Each
step zeroes out at least one person, so `n` members need at most `n-1`
transfers. This is a greedy approximation: the true optimum is NP-hard, since
it requires finding subsets that sum to zero. At household scale the
difference is zero or one transfer.

**Recurring expenses without a cron job.** Rules carry a `lastGeneratedAt`
date; due expenses are generated when a member opens the household. The
generation runs inside a transaction guarded by an optimistic check on that
date, so two simultaneous requests cannot create duplicates. This avoids a
separate scheduled process that would need its own deployment and monitoring.

**SSE authentication without tokens in URLs.** The browser's `EventSource`
cannot send headers, so the stream cannot carry the usual `Authorization`
header. Instead of putting the access token in the query string — where it
would land in server logs and proxies — the client exchanges it for a
separate 60-second ticket that opens the stream and grants nothing else.

**Access tokens live in memory only.** They are never written to
`localStorage`, where any injected script could read them. Sessions survive
page reloads through a `httpOnly` refresh cookie, which JavaScript cannot
access at all.

## Running locally

Requires Node 18+ and a PostgreSQL database.

```bash
git clone https://github.com/Giorikas24/roomsplit.git
cd roomsplit

cd server
npm install
cp .env.example .env
# fill in DATABASE_URL and generate the two JWT secrets:
#   openssl rand -base64 48
npx prisma migrate dev
npm run dev

# in a second terminal
cd client
npm install
npm run dev
```

The client runs on port 5173 and proxies `/api` to the server on port 4000,
so both share an origin and cookies work without CORS configuration.

## Data model

`User` → `GroupMember` → `Group` → `Expense` → `ExpenseShare`, with
`Settlement` recording repayments and `RecurringRule` plus
`RecurringParticipant` describing monthly bills.

Members are deactivated with a `leftAt` timestamp rather than deleted, so
the expense history of someone who moves out stays intact.

## Known limitations

- Expenses are split equally only; custom amounts and percentages are not
  implemented, though the schema already stores per-person shares and
  supports them without migration
- SSE connections are tracked in process memory, so running multiple
  instances would require a shared broker such as Redis
- No email notifications and no payment integration; settlements are
  recorded manually