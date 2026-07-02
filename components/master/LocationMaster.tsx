"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { LocationRow } from "@/app/(app)/master-data/page";

type Draft = Partial<LocationRow> & { location_code: string };

export function LocationMaster({ rows }: { rows: LocationRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRow | null>(null);
  const [draft, setDraft] = useState<Draft>({ location_code: "", is_active: true });
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => r.location_code.toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  function openAdd() { setEditing(null); setDraft({ location_code: "", is_active: true }); setErr(null); setOpen(true); }
  function openEdit(r: LocationRow) { setEditing(r); setDraft({ ...r }); setErr(null); setOpen(true); }

  async function save() {
    setErr(null);
    if (!draft.location_code?.trim()) { setErr("Location code is required"); return; }
    const payload = {
      location_code: draft.location_code.trim(),
      rack: draft.rack ?? null, bay: draft.bay ?? null,
      row_no: draft.row_no ?? null, level_no: draft.level_no ?? null,
      is_active: draft.is_active ?? true,
    };
    const { error } = editing
      ? await supabase.from("location_master").update(payload).eq("id", editing.id)
      : await supabase.from("location_master").insert(payload);
    if (error) { setErr(error.message); return; }
    await supabase.from("audit_logs").insert({ action: editing ? "UPDATE" : "INSERT", table_name: "location_master", record_id: payload.location_code });
    setOpen(false);
    router.refresh();
  }

  async function toggleActive(r: LocationRow) {
    await supabase.from("location_master").update({ is_active: !r.is_active }).eq("id", r.id);
    router.refresh();
  }

  async function remove(r: LocationRow) {
    if (!confirm(`Delete ${r.location_code}?`)) return;
    const { error } = await supabase.from("location_master").delete().eq("id", r.id);
    if (error) { alert(error.message); return; }
    await supabase.from("audit_logs").insert({ action: "DELETE", table_name: "location_master", record_id: r.location_code });
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search location…" className="max-w-xs" />
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add Location</Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-3 py-2">Code</th><th className="px-3 py-2">Rack</th><th className="px-3 py-2">Bay</th><th className="px-3 py-2">Row</th><th className="px-3 py-2">Level</th><th className="px-3 py-2">Active</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-semibold text-metaforge-navy">{r.location_code}</td>
                <td className="px-3 py-2">{r.rack ?? "—"}</td>
                <td className="px-3 py-2">{r.bay ?? "—"}</td>
                <td className="px-3 py-2">{r.row_no ?? "—"}</td>
                <td className="px-3 py-2">{r.level_no ?? "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => toggleActive(r)} className={`rounded-md px-2 py-0.5 text-xs ${r.is_active ? "bg-fifo-fresh/15 text-fifo-fresh" : "bg-slate-100 text-slate-500"}`}>
                    {r.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(r)} className="mr-2 text-muted-foreground hover:text-metaforge-navy"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r)} className="text-muted-foreground hover:text-fifo-critical"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.location_code}` : "Add Location"}>
        <div className="space-y-3">
          <Field label="Location Code (e.g. R12-C3)"><Input value={draft.location_code ?? ""} disabled={!!editing} onChange={(e) => setDraft({ ...draft, location_code: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rack"><Input value={draft.rack ?? ""} onChange={(e) => setDraft({ ...draft, rack: e.target.value })} /></Field>
            <Field label="Bay"><Input value={draft.bay ?? ""} onChange={(e) => setDraft({ ...draft, bay: e.target.value })} /></Field>
            <Field label="Row"><Input value={draft.row_no ?? ""} onChange={(e) => setDraft({ ...draft, row_no: e.target.value })} /></Field>
            <Field label="Level"><Input value={draft.level_no ?? ""} onChange={(e) => setDraft({ ...draft, level_no: e.target.value })} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-metaforge-navy">
            <input type="checkbox" className="h-4 w-4 accent-metaforge-amber" checked={draft.is_active ?? true} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />
            Active
          </label>
          {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Add"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-metaforge-navy">{label}</span>
      {children}
    </label>
  );
}
