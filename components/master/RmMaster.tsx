"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import type { RmMasterRow } from "@/types/database";

type Draft = Partial<RmMasterRow> & { rm_code: string };

export function RmMaster({ rows }: { rows: RmMasterRow[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RmMasterRow | null>(null);
  const [draft, setDraft] = useState<Draft>({ rm_code: "", plant: "Khatwad", status: "active" });
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => r.rm_code.toLowerCase().includes(n) || (r.description ?? "").toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  function openAdd() { setEditing(null); setDraft({ rm_code: "", plant: "Khatwad", status: "active" }); setErr(null); setOpen(true); }
  function openEdit(r: RmMasterRow) { setEditing(r); setDraft({ ...r }); setErr(null); setOpen(true); }

  async function save() {
    setErr(null);
    if (!draft.rm_code?.trim()) { setErr("RM Code is required"); return; }
    const payload = {
      rm_code: draft.rm_code.trim(),
      description: draft.description ?? null,
      plant: draft.plant ?? "Khatwad",
      lead_time: draft.lead_time ?? null,
      safety_factor: draft.safety_factor ?? null,
      max_level: draft.max_level ?? null,
      status: draft.status ?? "active",
    };
    const { error } = editing
      ? await supabase.from("rm_master").update(payload).eq("id", editing.id)
      : await supabase.from("rm_master").insert(payload);
    if (error) { setErr(error.message); return; }
    await supabase.from("audit_logs").insert({ action: editing ? "UPDATE" : "INSERT", table_name: "rm_master", record_id: payload.rm_code });
    setOpen(false);
    router.refresh();
  }

  async function remove(r: RmMasterRow) {
    if (!confirm(`Delete ${r.rm_code}?`)) return;
    const { error } = await supabase.from("rm_master").delete().eq("id", r.id);
    if (error) { alert(error.message); return; }
    await supabase.from("audit_logs").insert({ action: "DELETE", table_name: "rm_master", record_id: r.rm_code });
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between gap-3 border-b p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search RM…" className="max-w-xs" />
        <Button size="sm" onClick={openAdd}><Plus className="h-4 w-4" /> Add RM</Button>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-3 py-2">RM Code</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Plant</th><th className="px-3 py-2">Lead</th><th className="px-3 py-2">Safety</th><th className="px-3 py-2">Max</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-semibold text-metaforge-navy">{r.rm_code}</td>
                <td className="px-3 py-2">{r.description ?? "—"}</td>
                <td className="px-3 py-2">{r.plant ?? "—"}</td>
                <td className="px-3 py-2">{r.lead_time ?? "—"}</td>
                <td className="px-3 py-2">{r.safety_factor ?? "—"}</td>
                <td className="px-3 py-2">{r.max_level ?? "—"}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(r)} className="mr-2 text-muted-foreground hover:text-metaforge-navy"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(r)} className="text-muted-foreground hover:text-fifo-critical"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${editing.rm_code}` : "Add RM"}>
        <div className="space-y-3">
          <Field label="RM Code"><Input value={draft.rm_code ?? ""} disabled={!!editing} onChange={(e) => setDraft({ ...draft, rm_code: e.target.value })} /></Field>
          <Field label="Description"><Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plant"><Input value={draft.plant ?? ""} onChange={(e) => setDraft({ ...draft, plant: e.target.value })} /></Field>
            <Field label="Lead Time"><Input type="number" value={draft.lead_time ?? ""} onChange={(e) => setDraft({ ...draft, lead_time: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Safety Factor"><Input type="number" value={draft.safety_factor ?? ""} onChange={(e) => setDraft({ ...draft, safety_factor: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
            <Field label="Max Level"><Input type="number" value={draft.max_level ?? ""} onChange={(e) => setDraft({ ...draft, max_level: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
          </div>
          <Field label="Status">
            <select className="h-10 w-full rounded-md border px-3" value={draft.status ?? "active"} onChange={(e) => setDraft({ ...draft, status: e.target.value as RmMasterRow["status"] })}>
              <option value="active">active</option><option value="inactive">inactive</option>
            </select>
          </Field>
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
