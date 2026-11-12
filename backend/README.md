# VerifyAI — Backend (Node.js + Express API gateway)

Sits between the frontend and the ml-service: handles officer auth,
calls the ML service's `/analyze`, stores each result as a `Case` with
a SHA-256 hash-chain integrity record, and serves case history.

## Setup

```bash
npm install
cp .env.example .env   # edit JWT_SECRET — see below
```

Requires MongoDB and the ml-service running (see their own READMEs).

**Generate a real JWT secret** — don't ship the placeholder:
```bash
openssl rand -hex 32
```

**Seed an admin login** (once, against a fresh MongoDB):
```bash
node scripts/seedOfficer.js
# admin@verifyai.local / ChangeMe123! — change this password before anything but local dev
```

**macOS: port 5000 is taken by AirPlay Receiver (ControlCenter), not by
you.** `.env.example` defaults to `PORT=5050` for exactly this reason —
the plan originally specified 5000, but on macOS that silently binds to
AirPlay instead of your server (curl gets a `403 Forbidden` from
`AirTunes`, not a connection refused, which looks like the server is
running when it isn't). Either keep 5050 or disable AirPlay Receiver in
System Settings → General → AirDrop & Handoff if you want 5000 back.

## Running

```bash
npm start       # node server.js
npm run dev      # node --watch server.js (restarts on file change)
```

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/login` | — | `{ email, password }` → JWT |
| POST | `/api/screening/screen` | Bearer | multipart `document` + `selfie` files |
| GET | `/api/cases` | Bearer | paginated, `?page=&limit=` |
| GET | `/api/cases/:id` | Bearer | |
| GET | `/api/audit/verify` | Bearer | walks the hash chain, reports the first break if any |

## The audit log

`auditLog/hashChain.js` computes `SHA-256(case fields + previous case's
hash)` per `Case`. `auditLog/verifyChain.js` walks every `Case` in
creation order and recomputes each hash — altering any stored field
(directly in MongoDB, bypassing the API) breaks that record's hash and
every hash after it. Verified manually: editing a `Case.riskScore`
directly in `mongosh` and calling `/api/audit/verify` correctly reports
`valid: false` with the broken record's id.

This replaces the plan's originally specified Ethereum/Hardhat/Polygon
approach — same tamper-evidence property, no wallet/gas/RPC
infrastructure. See the plan doc's Review Notes for the reasoning.

## Known limitations (Phase 2)

- No automated tests yet for the routes (manual curl testing only so
  far) — unit tests for `hashChain`/`verifyChain` and route integration
  tests are still open.
- `Blacklist` model exists for the Phase 3 admin panel but has no routes
  yet — blacklist entries are managed via `ml-service/scripts/seed_blacklist.py`
  for now, both services pointing at the same MongoDB collection.
- No rate limiting or input size limits beyond multer's 10MB file cap.
