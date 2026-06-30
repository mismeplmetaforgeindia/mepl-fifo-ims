# MEPL FIFO IMS — Raw Material Inventory & FIFO Management

Production app for **METAFORGE ENGINEERING (I) PVT. LTD.** (Khatwad plant).
Next.js 15 · Supabase (Postgres + Auth + Realtime + Edge Functions) · Google Sheets sync · Vercel.

Google Sheets is the source of truth. The app syncs and displays it — no inventory calculations.

## Build phases
- **Phase 1 — Foundation (this drop):** schema, RLS, Auth, app shell, sidebar, topbar, login, middleware.
- **Phase 2 — Sync engine:** service-account Sheets client, `sync-sheets` Edge Function, `pg_cron`, FIFO merge.
- **Phase 3 — FIFO board:** material picker, FIFO cards (4 states), `+ Add rack` modal, table view, KPI strip, realtime.
- **Phase 4 — Remaining modules:** Dashboard table, GRN, Issue History, Master Data, Admin panel, write-back.

## Phase 1 setup

1. **Create a fresh Supabase project** (cloud). Note the project URL, anon key, service-role key.
2. **Run the schema.** In the Supabase SQL editor, run `supabase/migrations/001_initial_schema.sql`, then `supabase/seed.sql`.
3. **Env.** `cp .env.local.example .env.local` and fill the three Supabase values. (Sheets values are Phase 2.)
4. **Install & run:**
   ```bash
   npm install
   npm run dev
   ```
5. **Create your login.** Supabase dashboard → Authentication → Users → Add user (email + password), or enable signups. Every new user is created as `viewer`.
6. **Promote yourself to admin** (SQL editor):
   ```sql
   update public.users set role = 'admin' where email = 'you@metaforge.in';
   ```
   Sign in at `/login` — the ADMIN badge and admin nav items appear.

## Notes
- **Foreign keys:** synced columns use indexed soft references (no hard FK) so a typo in the hand-edited sheet can never reject a whole sync row. Hard FKs are reserved for app-managed integrity. See the header comment in `001_initial_schema.sql`.
- **FIFO sequence & age** are computed at query time in `v_fifo_queue` (never stored).
- **Theme toggle** in the TopBar (sun icon in the reference) is added with the dark-mode pass; Phase 1 ships light mode.
- **Auth guard:** `middleware.ts` redirects unauthenticated users to `/login`; admin-only sections are gated by role in the app layout/pages.

## Deploy (Vercel)
Push to GitHub, import in Vercel, set the same env vars, deploy. Supabase stays on Supabase Cloud.
