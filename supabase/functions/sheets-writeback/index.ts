// =====================================================================
// Supabase Edge Function: sheets-writeback   (Deno runtime)
//
// Direction 2 of the sync (Supabase -> Sheets). Called when an admin
// assigns a rack in the app, so the Racked (248) tab (source of truth)
// stays in step. Strategy: last-write-wins — update the coil's Rack cell
// if the coil row exists, else append a new row. Failures are reported
// back so the app can show a "retry" banner; the local assignment always
// stands regardless.
//
// Secrets: GOOGLE_SERVICE_ACCOUNT_JSON (base64), GOOGLE_SHEET_ID, SHEET_TAB_RACKED
// =====================================================================

const norm = (s: string) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function pemToPkcs8(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  const bin = atob(b64); const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }))}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToPkcs8(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${b64url(sig)}` }),
  });
  if (!res.ok) throw new Error(`token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token as string;
}
const colLetter = (i: number) => {
  let s = ""; i += 1;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
};

Deno.serve(async (req) => {
  try {
    const { coil_number, rm_code, location_code } = await req.json();
    if (!coil_number || !location_code) throw new Error("coil_number and location_code required");

    const sa = JSON.parse(atob(Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")!));
    const sheetId = Deno.env.get("GOOGLE_SHEET_ID")!;
    const tab = Deno.env.get("SHEET_TAB_RACKED") ?? "Racked (248)";
    const token = await getAccessToken(sa);
    const enc = encodeURIComponent(`'${tab.replace(/'/g, "''")}'`);

    // Read the tab to locate the header row + the coil's row
    const r = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`read: ${r.status} ${await r.text()}`);
    const rows: string[][] = (await r.json()).values ?? [];

    // header row = first with both coilno + rack
    let hdr = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const cells = rows[i].map(norm);
      if (cells.includes("coilno") && cells.includes("rack")) { hdr = i; break; }
    }
    if (hdr < 0) throw new Error("could not find header row (coil no / rack) in Racked tab");
    const headers = rows[hdr].map(norm);
    const coilIdx = headers.indexOf("coilno");
    const rackIdx = headers.indexOf("rack");
    const rmIdx = headers.indexOf("rmcode");

    // find existing row for this coil
    let target = -1;
    for (let i = hdr + 1; i < rows.length; i++) {
      if ((rows[i][coilIdx] ?? "").trim() === String(coil_number).trim()) { target = i; break; }
    }

    if (target >= 0) {
      // update the Rack cell in place
      const range = `${tab}!${colLetter(rackIdx)}${target + 1}`;
      const u = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [[location_code]] }) });
      if (!u.ok) throw new Error(`update: ${u.status} ${await u.text()}`);
      return new Response(JSON.stringify({ ok: true, action: "updated", row: target + 1 }), { headers: { "Content-Type": "application/json" } });
    } else {
      // append a new row (coil + rack + rm in their columns)
      const width = Math.max(coilIdx, rackIdx, rmIdx) + 1;
      const row = new Array(width).fill("");
      row[coilIdx] = coil_number;
      row[rackIdx] = location_code;
      if (rmIdx >= 0 && rm_code) row[rmIdx] = rm_code;
      const a = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${enc}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ values: [row] }) });
      if (!a.ok) throw new Error(`append: ${a.status} ${await a.text()}`);
      return new Response(JSON.stringify({ ok: true, action: "appended" }), { headers: { "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
