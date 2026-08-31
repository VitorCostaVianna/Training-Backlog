# Training Backlog

A mobile-first Progressive Web App for logging strength-training workouts and tracking progression over time.

**Live demo:** [backlog-treino.vercel.app](https://backlog-treino.vercel.app)

## Overview

React + Vite + TypeScript on the frontend, Supabase (Postgres + Auth + Row Level Security) on the backend, built **offline-first** with local caching and a sync queue — the app stays fully usable without a network connection, and syncs automatically once connectivity returns.

Design reference in [`design_handoff_backlog_treino/`](./design_handoff_backlog_treino).

## Architecture

**Auth** — Email/password via Supabase Auth ([`src/screens/Auth.tsx`](./src/screens/Auth.tsx)). A `handle_new_user` database trigger seeds each new account with a profile and four default workout templates (A–D) — structural templates only, no fake history. The first empty screen has an explicit "Load sample data" button instead.

**Offline-first** ([`src/lib/storage.ts`](./src/lib/storage.ts))
- The **active workout in progress** lives only on-device (`localStorage`), never depends on the network, and survives page reload or a crash. Reopening the app with an active session resumes directly on the Workout tab.
- Remote reads are mirrored into a **per-user local cache**; with no network, the app renders entirely from cache.
- Completed workouts are queued in an **outbox** with client-generated UUIDs and sent via idempotent upsert once connectivity returns (on the browser's `online` event or next app boot).

**Derived statistics** ([`src/lib/stats.ts`](./src/lib/stats.ts)) — PRs, "last weight × reps," 10-week e1RM history (Epley formula), and weekly volume/streak are all computed from the real set-by-set history, with nothing denormalized in the database.

**PWA** — `vite-plugin-pwa` (Workbox) pre-caches the app shell and runtime-caches Google Fonts; manifest and icons live in [`public/icons/`](./public/icons). Installable on iOS/Android via "Add to Home Screen."

**Privacy** — The client only ever uses the anon key; account isolation is enforced entirely by Postgres Row Level Security policies, not by client-side filtering.

## Setup

1. Create a free project on [Supabase](https://supabase.com).
2. **Run the migration:** in the dashboard, open *SQL Editor*, paste the contents of [`supabase/migration.sql`](./supabase/migration.sql), and execute. This creates the tables (`profiles`, `fichas`, `ficha_exercises`, `sessions`, `session_exercises`, `session_sets`), enables Row Level Security on all of them, and installs the signup trigger.
3. **Configure environment:** copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (dashboard → *Project Settings* → *API*).
4. *(Optional, recommended for testing)* Disable email confirmation under *Authentication → Sign In / Providers → Email → Confirm email*, so sign-up doesn't require clicking a confirmation link.
5. **Run:**

```bash
npm install
npm run dev        # development
npm run build      # production build (dist/) — includes the service worker
npm run preview    # serve the production build
```

## Out of scope (for now)

Billing/subscriptions and native packaging (Capacitor) — the architecture (private accounts, RLS, client-generated IDs, outbox pattern) was deliberately designed to accommodate both later without rework.

## Contact

Developed by Vitor Costa · [LinkedIn](https://www.linkedin.com/in/vitor-costa-vianna-5449832b8/) · vitorcostavianna@gmail.com
