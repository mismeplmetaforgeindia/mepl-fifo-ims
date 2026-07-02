"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Loader2, MapPin, EyeOff, Eye, Search, Download, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtInt, fmtKg } from "@/lib/format";
import { ageTextClass } from "@/lib/fifo/aging";
import { AssignRackModal } from "@/components/fifo/AssignRackModal";
import { assignRackBulk, setHidden } from "@/app/(app)/unracked/actions";
import type { FifoQueueItem } from "@/components/fifo/types";

type Row = FifoQueueItem & { hidden?: boolean; issued_total?: number; issue_count?: number };
const consumed = (r: Row) => (r.issue_count ?? 0) > 0;

export function UnrackedCoils({
  rows, isAdmin, knownRacks,
}: { rows: Row[]; isAdmin: boolean; knownRacks: string[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"active" | "hidden">("active");
  const [flag, setFlag] = useState<"all" | "consumed" | "clean">("all");
  const [q, setQ] = useState("");
  const [rmFilter, setRmFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [override, setOverride] = useState<Map<string, boolean>>(new Map());
  const [bulkCode, setBulkCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [assigning, setAssigning] = useState<Row | null>(null);

  const isHidden = (r: Row) => (override.has(r.coil_number) ? override.get(r.coil_number)! : !!r.hidden);
  const base = useMemo(() => rows.filter((r) => !removed.has(r.coil_number)), [rows, removed]);
  const activeAll = useMemo(() => base.filter((r) => !isHidden(r)), [base, override]);
  const hiddenAll = useMemo(() => base.filter((r) => isHidden(r)), [base, override]);
  const consumedActive = useMemo(() => activeAll.filter(consumed).length, [activeAll]);

  const pool = tab === "active" ? activeAll : hiddenAll;
  const rmCodes = useMemo(() => Array.from(new Set(pool.map((r) => r.rm_code).filter(Boolean))).sort() as string[], [pool]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pool.filter((r) => {
      if (tab === "active" && flag === "consumed" && !consumed(r)) return false;
      if (tab === "active" && flag === "clean" && consumed(r)) return false;
      if (rmFilter && r.rm_code !== rmFilter) return false;
      if (!needle) return true;
      return r.coil_number.toLowerCase().includes(needle) || (r.rm_code ?? "").toLowerCase().includes(needle) || (r.heat_number ?? "").toLowerCase().includes(needle);
    });
  }, [pool, q, rmFilter, tab, flag]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.coil_number));
  const toggle = (c: string) => setSelected((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(filtered.map((r) => r.coil_number)));

  function exportExcel() {
    const data = filtered.map((r) => ({
      "Coil Number": r.coil_number, "RM Code": r.rm_code ?? "", "Heat": r.heat_number ?? "",
      "Received": r.received_date, "Age (days)": r.age_days, "Weight (kg)": r.weight_available ?? "",
      "Issued (kg)": r.issued_total ?? 0, "Flag": consumed(r) ? "CONSUMED - confirm physically" : "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, tab === "active" ? "Unracked" : "Hidden");
    XLSX.writeFile(wb, `${tab}-coils-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function doBulk() {
    if (!bulkCode.trim() || selected.size === 0) return;
    setBusy(true); setMsg(null);
    const items = base.filter((r) => selected.has(r.coil_number)).map((r) => ({ coil: r.coil_number, rm: r.rm_code }));
    const res = await assignRackBulk(items, bulkCode);
    if (res.ok) setRemoved((s) => new Set([...s, ...items.map((i) => i.coil)]));
    setMsg({ ok: res.ok, text: res.message });
    setBusy(false); setSelected(new Set()); setBulkCode(""); router.refresh();
  }

  async function setHide(coil: string, val: boolean) {
    setOverride((m) => new Map(m).set(coil, val));
    setSelected((s) => { const n = new Set(s); n.delete(coil); return n; });
    const res = await setHidden(coil, val);
    if (!res.ok) {
      setOverride((m) => { const n = new Map(m); n.delete(coil); return n; });
      setMsg({ ok: false, text: `${val ? "Hide" : "Unhide"} failed: ${res.error ?? "unknown"} — did you run migration 005?` });
    }
  }

  const flagChips = [
    { k: "all", label: `All (${fmtInt(activeAll.length)})` },
    { k: "consumed", label: `⚠ Consumed (${fmtInt(consumedActive)})` },
    { k: "clean", label: `Clean (${fmtInt(activeAll.length - consumedActive)})` },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Unracked Coils</h1>
          <p className="mt-0.5 text-sm text-slate-500">{fmtInt(activeAll.length)} awaiting a rack · {fmtInt(hiddenAll.length)} hidden</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4" /> Download Excel</Button>
      </div>

      {/* consumed warning banner */}
      {tab === "active" && consumedActive > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            <span className="font-semibold">{fmtInt(consumedActive)} coil(s)</span> here already appear in Issue History — they may be physically consumed.
            <span className="font-medium"> Confirm on the shop floor before racking.</span> Use the “⚠ Consumed” filter to review them.
          </p>
        </div>
      )}

      {/* Active / Hidden */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(["active", "hidden"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setSelected(new Set()); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-slate-900 text-white" : "text-slate-600"}`}>
              {t === "active" ? `Active (${fmtInt(activeAll.length)})` : `Hidden (${fmtInt(hiddenAll.length)})`}
            </button>
          ))}
        </div>
        {tab === "active" && (
          <div className="flex rounded-lg bg-slate-100 p-1">
            {flagChips.map((c) => (
              <button key={c.k} onClick={() => setFlag(c.k)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${flag === c.k ? (c.k === "consumed" ? "bg-amber-500 text-white" : "bg-slate-900 text-white") : "text-slate-600"}`}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search coil, RM, heat…" className="pl-9" />
        </div>
        <select className="rounded-md border px-2 py-2 text-sm" value={rmFilter} onChange={(e) => setRmFilter(e.target.value)}>
          <option value="">All RM codes</option>
          {rmCodes.map((rm) => <option key={rm} value={rm}>{rm}</option>)}
        </select>
        <span className="text-sm text-slate-400">{fmtInt(filtered.length)} shown</span>
      </div>

      {/* bulk bar */}
      {isAdmin && tab === "active" && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-orange-300 bg-orange-50 p-3">
          <span className="text-sm font-medium text-slate-900">{selected.size} selected</span>
          <Input list="bulk-racks" value={bulkCode} onChange={(e) => setBulkCode(e.target.value)} placeholder="Rack code e.g. R12-C3" className="w-48" disabled={busy} />
          <datalist id="bulk-racks">{knownRacks.map((r) => <option key={r} value={r} />)}</datalist>
          <Button size="sm" onClick={doBulk} disabled={busy || !bulkCode.trim()}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Assign {selected.size} to rack</Button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-slate-500 underline">clear</button>
        </div>
      )}
      {msg && <p className={`rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {/* table */}
      <div className="overflow-auto rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              {isAdmin && tab === "active" && <th className="px-3 py-2.5 w-10"><input type="checkbox" className="h-4 w-4 accent-orange-500" checked={allChecked} onChange={toggleAll} /></th>}
              <th className="px-3 py-2.5">Coil</th>
              <th className="px-3 py-2.5">RM</th>
              <th className="px-3 py-2.5">Heat</th>
              <th className="px-3 py-2.5">Received</th>
              <th className="px-3 py-2.5">Age</th>
              <th className="px-3 py-2.5 text-right">Weight</th>
              <th className="px-3 py-2.5">Flag</th>
              {isAdmin && <th className="px-3 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((r) => {
              const con = consumed(r);
              return (
                <tr key={r.id} className={`border-t ${con ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}`}>
                  {isAdmin && tab === "active" && <td className="px-3 py-2.5"><input type="checkbox" className="h-4 w-4 accent-orange-500" checked={selected.has(r.coil_number)} onChange={() => toggle(r.coil_number)} /></td>}
                  <td className="px-3 py-2.5 font-semibold text-slate-900">{r.coil_number}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.rm_code ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.heat_number ?? "—"}</td>
                  <td className="px-3 py-2.5 text-slate-600">{r.received_date}</td>
                  <td className={`px-3 py-2.5 ${ageTextClass(r.age_days)}`}>{r.age_days}d</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtKg(r.weight_available)}</td>
                  <td className="px-3 py-2.5">
                    {con ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Consumed — confirm physically
                        <span className="ml-1 font-normal text-amber-700">({fmtKg(r.issued_total)} issued)</span>
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-2">
                        {tab === "active" ? (
                          <>
                            <button onClick={() => setAssigning(r)} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium hover:border-orange-400 hover:text-orange-600"><MapPin className="h-3 w-3" /> Assign</button>
                            <button onClick={() => setHide(r.coil_number, true)} title="Mark handled / hide" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"><EyeOff className="h-3 w-3" /> {con ? "Confirm & hide" : "Hide"}</button>
                          </>
                        ) : (
                          <button onClick={() => setHide(r.coil_number, false)} title="Restore to active" className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-orange-400"><Eye className="h-3 w-3" /> Unhide</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && <tr><td colSpan={10} className="p-6 text-center text-slate-400">{tab === "active" ? "No coils match." : "No hidden coils."}</td></tr>}
          </tbody>
        </table>
        {filtered.length > 500 && <p className="border-t p-3 text-center text-xs text-slate-400">Showing first 500 of {fmtInt(filtered.length)} — narrow with search/filter. (Excel includes all.)</p>}
      </div>

      {assigning && <AssignRackModal item={assigning} knownRacks={knownRacks} onClose={() => setAssigning(null)} onAssigned={() => { setRemoved((s) => new Set(s).add(assigning.coil_number)); router.refresh(); }} />}
    </div>
  );
}
