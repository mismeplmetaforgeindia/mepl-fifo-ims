# Phase 2 — Sync Engine setup

Read direction: Google Sheets → Supabase, hourly + manual. No write-back yet (Phase 4).

Files in this phase:
- `supabase/functions/sync-sheets/index.ts` — the engine (Deno Edge Function)
- `supabase/migrations/002_sync_merge_cron.sql` — `run_fifo_merge()` + hourly `pg_cron` job
- `lib/fifo/aging.ts` — aging thresholds for the board (Phase 3 uses it)
- `app/api/sync/route.ts` — admin-only manual sync trigger

---

## 1. Create a Google service account

1. console.cloud.google.com → create or pick a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account.** Name it e.g. `mepl-sheets-sync`. Create.
4. Open the service account → **Keys → Add key → Create new key → JSON.** A `.json` file downloads. Keep it safe.
5. Open the JSON, copy the `client_email` value (looks like `mepl-sheets-sync@…iam.gserviceaccount.com`).
6. **Share the Google Sheet with that email** — open the sheet → Share → paste the client_email → give **Editor** (Viewer works for Phase 2, but Editor is needed for Phase 4 write-back, so set it now).

## 2. Base64-encode the service-account JSON

The secret is stored as base64. In **PowerShell**:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\path\to\service-account.json"))
```

Copy the (long, single-line) output.

## 3. Install the Supabase CLI and link the project

```cmd
npm install -g supabase
supabase login
supabase link --project-ref rnywwfcxqrnrvcdkpsnz
```

(`supabase login` opens a browser. `link` may ask for the DB password.)

## 4. Set the Edge Function secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do **not** set them. Set the rest (mind the quotes: the issues/racked tab names contain `/`, spaces, and parens):

```cmd
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON="PASTE_THE_BASE64_HERE"
supabase secrets set GOOGLE_SHEET_ID="1y5z0-eC_vZeOSS_DBwqNU5hvqrCZPaC1Xl7vwFjwEwQ"
supabase secrets set SHEET_TAB_DASHBOARD="DASHBOARD"
supabase secrets set SHEET_TAB_GRN="GRN"
supabase secrets set SHEET_TAB_ISSUES="ISSUE_TO_M/C"
supabase secrets set SHEET_TAB_RACKED="Racked (248)"
```

## 5. Deploy the Edge Function

```cmd
supabase functions deploy sync-sheets
```

Deploy with JWT verification ON (the default) — pg_cron and /api/sync both call it with the service-role key, which is a valid JWT, so they pass; random callers don't.

## 6. Run migration 002

In the Supabase **SQL editor**:
1. First replace `<SERVICE_ROLE_KEY>` in `002_sync_merge_cron.sql` with your current service-role key (the cron job needs it to call the function).
2. Run the whole file. It creates `run_fifo_merge()`, enables `pg_cron` + `pg_net`, and schedules the hourly job.

## 7. Test a manual sync

In **PowerShell**, fire the function once (replace the key):

```powershell
$key = "YOUR_SERVICE_ROLE_KEY"
Invoke-RestMethod -Method Post `
  -Uri "https://rnywwfcxqrnrvcdkpsnz.supabase.co/functions/v1/sync-sheets" `
  -Headers @{ Authorization = "Bearer $key"; "Content-Type" = "application/json" } `
  -Body '{"trigger":"manual"}'
```

You should get back `{ ok: true, result: { dashboard: N, grn: N, issues: N, racked: N, merge: {...} } }`.

Then verify in the SQL editor:

```sql
select sheet_tab, status, rows_synced, rows_skipped, error_message, completed_at
from sync_logs order by completed_at desc limit 10;

select count(*) from dashboard_data;
select count(*) from grn_entries;
select count(*) from fifo_lots;          -- should match grn_entries count
select count(*) from coil_locations;
select * from v_fifo_queue limit 5;      -- FIFO board feed, sequence + age computed
```

## Notes / gotchas
- **Header mapping**: the function maps by normalized header name (lowercase, no spaces/punctuation). If a tab's real header differs from the spec, that column comes through null — check `rows_skipped` and the counts above. Send me the actual header row of any tab that looks off and I'll adjust the map.
- **received_date** is derived from the coil-number date tail (`…-250409` → 2025-04-09). Rows whose coil has no parseable tail and no usable Received Date column are skipped and counted in `rows_skipped` for GRN.
- **Orphans** (racked coils with no GRN) are counted in the merge log and intentionally kept off the board.
- The hourly job runs at minute 0 of every hour. Check it with `select * from cron.job;` and `select * from cron.job_run_details order by start_time desc limit 5;`.
- Rotate your service-role key if it has been shared anywhere; update both the cron job and Vercel/`.env.local` after rotating.
