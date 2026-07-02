// =====================================================================
// Supabase Edge Function: sync-sheets   (Deno runtime)
//
// Direction 1 of the sync (Sheets -> Supabase). Triggered hourly by
// pg_cron and on demand by POST /api/sync from the Admin Panel.
//
// Header rows are auto-detected per tab (some tabs have a title/summary
// row above the real header). Column names match the live "PLANT 2 RAW
// MATERIAL" workbook. No inventory math — data mirrored as-is.
// received_date is taken from the coil-number date tail (…-260327 ->
// 2026-03-27), falling back to the tab's date column.
//
// Function secrets: GOOGLE_SERVICE_ACCOUNT_JSON (base64), GOOGLE_SHEET_ID,
// SHEET_TAB_DASHBOARD/GRN/ISSUES/RACKED.  SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------- small utils ----------
const norm = (s: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

const txt = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

// Keep the LAST occurrence of each conflict key. Postgres rejects an upsert
// batch that contains the same ON CONFLICT key twice, so we collapse dupes
// here (the sheet legitimately repeats coil numbers / issue keys).
function dedupeBy<T>(rows: T[], keyFn: (r: T) => string): T[] {
  const m = new Map<string, T>();
  for (const r of rows) m.set(keyFn(r), r);
  return [...m.values()];
}

// Coil tail -> ISO date. "U4H-01250-260327" -> "2026-03-27"
function coilDate(coil: string): string | null {
  const m = String(coil ?? "").trim().match(/(\d{6})$/);
  if (!m) return null;
  const yy = m[1].slice(0, 2), mm = m[1].slice(2, 4), dd = m[1].slice(4, 6);
  const mo = Number(mm), d = Number(dd);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `20${yy}-${mm}-${dd}`;
}

// Parse ISO (2026-03-27) or DD/MM/YYYY (31/03/2026) -> ISO date string.
function parseDate(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // DD/MM/YYYY
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

// ---------- Google service-account auth ----------
function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token as string;
}

// ---------- read all tabs ----------
async function readTabs(token: string, sheetId: string, tabs: string[]) {
  const ranges = tabs.map((t) => `ranges='${t.replace(/'/g, "''")}'`).join("&");
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${ranges}&majorDimension=ROWS`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets batchGet failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return (json.valueRanges ?? []).map((vr: { values?: string[][] }) => vr.values ?? []);
}

// Find the header row: the row (within the first 15) whose normalized cells
// contain the most of the given marker headers. Handles title/summary rows.
function findHeaderRow(rows: string[][], markers: string[]): number {
  let best = 0, bestScore = -1;
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const cells = rows[i].map(norm);
    const score = markers.filter((m) => cells.includes(m)).length;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

// Build objects keyed by normalized header, starting after the header row.
function toRecords(rows: string[][], headerIdx: number): Record<string, string>[] {
  if (!rows.length || headerIdx >= rows.length) return [];
  const headers = rows[headerIdx].map(norm);
  return rows.slice(headerIdx + 1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) o[h] = r[i] ?? ""; });
    return o;
  });
}

// ---------- column mappers (live workbook column names) ----------
function mapDashboard(rows: Record<string, string>[]) {
  return rows
    .filter((r) => txt(r.rmcode))
    .map((r) => ({
      rm_code: txt(r.rmcode)!,
      description: txt(r.itemdescription),
      plant: txt(r.plant) ?? "Khatwad",
      physical_stock: num(r.physicalstock),
      peak_avg_daily: num(r.peakavgdailyconsumption),
      avg_daily: num(r.avgdailyconsumption),
      off_avg_daily: num(r.offavgdailyconsumption),
      lead_time: num(r.leadtime),
      safety_factor: num(r.safetyfactor),
      max_level: num(r.maxlevel),
      opening_stock: num(r["10june"]),
      inward: num(r.inward),
      outward: num(r.outward),
      khatwad_received: num(r.khatwadreceivedfrommetaforge),
      khatwad_sent: num(r.khatwadsendtometaforge),
      synced_at: new Date().toISOString(),
    }));
}

function mapGrn(rows: Record<string, string>[]) {
  return rows.map((r) => {
    const coil = txt(r.coilno ?? r.coilnumber ?? r.coil);
    if (!coil) return null;
    const received = coilDate(coil) ?? parseDate(r.date ?? r.receiveddate ?? r.dataentrydate);
    if (!received) return null;
    return {
      coil_number: coil,
      rm_code: txt(r.rmcode),
      heat_number: txt(r.heatno ?? r.heatnumber),
      weight: num(r.weight),
      supplier: txt(r.supplier),
      received_date: received,
      plant: txt(r.plant) ?? "Khatwad",
      source: "GRN",
      synced_at: new Date().toISOString(),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
}

function mapIssues(rows: Record<string, string>[]) {
  return rows.map((r) => {
    const coil = txt(r.coilno ?? r.coilnumber);
    const date = parseDate(r.date ?? r.issuedate) ?? coilDate(coil ?? "");
    if (!coil || !date) return null;
    return {
      coil_number: coil,
      rm_code: txt(r.rmcode),
      machine: txt(r.mcno ?? r.machine) ?? "",   // part of upsert key -> no nulls
      issued_qty: num(r.weight ?? r.issuedquantity),
      issue_date: date,
      shift: txt(r.shift) ?? "",
      operator: txt(r.operator),
      synced_at: new Date().toISOString(),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
}

function mapRacked(rows: Record<string, string>[]) {
  return rows.map((r) => {
    const coil = txt(r.coilno ?? r.coilnumber);
    if (!coil) return null;
    const rack = txt(r.rack);                    // the Rack column IS the code, e.g. R12-C3
    return {
      coil_number: coil,
      rm_code: txt(r.rmcode),
      rack: rack,
      bay: null as string | null,
      row_no: null as string | null,
      level_no: null as string | null,
      location_code: txt(r.locationcode) ?? rack,
      assigned_at: new Date().toISOString(),
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);
}

// ---------- main ----------
Deno.serve(async (req) => {
  const trigger = await req.json().then((b) => b?.trigger ?? "manual").catch(() => "manual");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const log = async (tab: string, status: string, synced: number, skipped: number, err?: string) => {
    await supabase.from("sync_logs").insert({
      sheet_tab: tab, trigger, status,
      rows_synced: synced, rows_skipped: skipped,
      error_message: err ?? null, completed_at: new Date().toISOString(),
    });
  };

  try {
    const sa = JSON.parse(atob(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!));
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID")!;
    const tabs = {
      dashboard: Deno.env.get("SHEET_TAB_DASHBOARD") ?? "DASHBOARD",
      grn: Deno.env.get("SHEET_TAB_GRN") ?? "GRN",
      issues: Deno.env.get("SHEET_TAB_ISSUES") ?? "ISSUE_TO_M/C",
      racked: Deno.env.get("SHEET_TAB_RACKED") ?? "Racked (248)",
    };

    const token = await getAccessToken(sa);
    const [dashRows, grnRows, issueRows, rackRows] = await readTabs(token, sheetId, [
      tabs.dashboard, tabs.grn, tabs.issues, tabs.racked,
    ]);

    const result: Record<string, unknown> = {};

    // DASHBOARD — header auto-detected (row 2), overwrite on rm_code
    const dash = dedupeBy(
      mapDashboard(toRecords(dashRows, findHeaderRow(dashRows, ["rmcode", "physicalstock", "itemdescription"]))),
      (r) => r.rm_code,
    );
    if (dash.length) {
      const { error } = await supabase.from("dashboard_data").upsert(dash, { onConflict: "rm_code" });
      await log(tabs.dashboard, error ? "failed" : "success", error ? 0 : dash.length, 0, error?.message);
    } else await log(tabs.dashboard, "success", 0, 0);
    result.dashboard = dash.length;

    // GRN — header row 1, upsert on coil_number
    const grnRecs = toRecords(grnRows, findHeaderRow(grnRows, ["coilno", "rmcode", "heatno"]));
    const grn = dedupeBy(mapGrn(grnRecs), (r) => r.coil_number);
    if (grn.length) {
      const { error } = await supabase.from("grn_entries").upsert(grn, { onConflict: "coil_number" });
      await log(tabs.grn, error ? "failed" : "success", error ? 0 : grn.length, grnRecs.length - grn.length, error?.message);
    } else await log(tabs.grn, "success", 0, grnRecs.length);
    result.grn = grn.length;

    // ISSUE_TO_M/C — header row 1, upsert on composite key
    const issues = dedupeBy(
      mapIssues(toRecords(issueRows, findHeaderRow(issueRows, ["coilno", "rmcode", "mcno"]))),
      (r) => `${r.coil_number}|${r.issue_date}|${r.machine}|${r.shift}`,
    );
    if (issues.length) {
      const { error } = await supabase.from("issue_transactions")
        .upsert(issues, { onConflict: "coil_number,issue_date,machine,shift" });
      await log(tabs.issues, error ? "failed" : "success", error ? 0 : issues.length, 0, error?.message);
    } else await log(tabs.issues, "success", 0, 0);
    result.issues = issues.length;

    // Racked (248) — header row 3, upsert on coil_number
    const racked = dedupeBy(
      mapRacked(toRecords(rackRows, findHeaderRow(rackRows, ["coilno", "rmcode", "rack"]))),
      (r) => r.coil_number,
    );
    if (racked.length) {
      const { error } = await supabase.from("coil_locations").upsert(racked, { onConflict: "coil_number" });
      await log(tabs.racked, error ? "failed" : "success", error ? 0 : racked.length, 0, error?.message);
    } else await log(tabs.racked, "success", 0, 0);
    result.racked = racked.length;

    // Rebuild the FIFO board
    const { data: merge, error: mergeErr } = await supabase.rpc("run_fifo_merge");
    const m = Array.isArray(merge) ? merge[0] : merge;
    await log("FIFO_MERGE", mergeErr ? "failed" : "success", m?.inserted ?? 0, m?.orphaned ?? 0, mergeErr?.message);
    result.merge = m ?? null;

    return new Response(JSON.stringify({ ok: true, trigger, result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    await log("ALL", "failed", 0, 0, String(e));
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
