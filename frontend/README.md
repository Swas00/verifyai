# VerifyAI — Frontend (React + Tailwind)

Officer dashboard: login, document/selfie upload, real-time risk result,
case history, and case detail (including the audit hash for that case).

## Setup

```bash
npm install
```

Requires the backend running on `http://localhost:5050` (the dev server
proxies `/api/*` there — see `vite.config.js`). No separate `.env` needed
in dev; the proxy makes the frontend/backend origin split invisible.

## Running

```bash
npm run dev       # http://localhost:5173
```

Log in with the officer account seeded via `backend/scripts/seedOfficer.js`
(`admin@verifyai.local` / `ChangeMe123!` by default).

## Structure

- `src/pages/` — `Login`, `Dashboard`, `CaseDetail` (one per route)
- `src/components/` — `UploadPanel`, `RiskCard`, `CaseHistory`, `AlertFeed`
- `src/hooks/` — `useAuth` (JWT in localStorage, React context), `useScreening`
- `src/services/api.js` — all backend calls, axios instance with the
  auth token attached via interceptor

## Verified (2026-11-12)

Driven through an actual headless Chromium session (Playwright), not
just curl against the API: login renders, officer can log in, upload
both files, submit, see the risk card with correct explainable reasons
and a blacklist HIT correctly flagged, case history populates, and the
case detail page shows the audit hash. No console errors in any of it.

## Known limitations (Phase 2)

- No client-side tests yet.
- Auth token lives in `localStorage` (readable by any script on the
  page) rather than an httpOnly cookie — acceptable for this stage, but
  worth revisiting before anything beyond local dev.
- No loading/error states for the case-history fetch itself (only for
  the screening submission).
