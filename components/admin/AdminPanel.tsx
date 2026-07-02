"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/table/DataTable";
import { setUserRole, setUserActive } from "@/app/(app)/admin/actions";

interface SyncLog {
  id: string; sheet_tab: string | null; trigger: string | null; status: string | null;
  rows_synced: number | null; rows_skipped: number | null; error_message: string | null; completed_at: string | null;
}
interface AuditLog {
  id: string; action: string | null; table_name: string | null; record_id: string | null;
  new_value: unknown; created_at: string;
}
interface UserRow {
  id: string; email: string; full_name: string | null; role: "admin" | "viewer"; is_active: boolean;
}

const fmtTime = (t: string | null) => (t ? new Date(t).toLocaleString("en-IN") : "—");

export function AdminPanel({
  logs, audits, users, lastSync,
}: { logs: SyncLog[]; audits: AuditLog[]; users: UserRow[]; lastSync: string | null }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function runSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        const r = data.result ?? {};
        setMsg({ ok: true, text: `Synced — dashboard ${r.dashboard ?? 0}, GRN ${r.grn ?? 0}, issues ${r.issues ?? 0}, racked ${r.racked ?? 0}` });
      } else {
        setMsg({ ok: false, text: data.error ?? "Sync failed" });
      }
    } catch (e) {
      setMsg({ ok: false, text: String(e) });
    } finally {
      setSyncing(false);
      router.refresh();
    }
  }

  const logCols: ColumnDef<SyncLog, unknown>[] = [
    { accessorKey: "completed_at", header: "Time", cell: (c) => fmtTime(c.getValue() as string) },
    { accessorKey: "sheet_tab", header: "Tab", cell: (c) => String(c.getValue() ?? "—") },
    { accessorKey: "trigger", header: "Trigger", cell: (c) => String(c.getValue() ?? "—") },
    {
      accessorKey: "status", header: "Status",
      cell: (c) => {
        const s = String(c.getValue() ?? "");
        const ok = s === "success";
        return <span className={ok ? "text-fifo-fresh" : "text-fifo-critical"}>{s}</span>;
      },
    },
    { accessorKey: "rows_synced", header: "Synced", meta: { align: "right" }, cell: (c) => String(c.getValue() ?? 0) },
    { accessorKey: "rows_skipped", header: "Skipped", meta: { align: "right" }, cell: (c) => String(c.getValue() ?? 0) },
    { accessorKey: "error_message", header: "Error", cell: (c) => <span className="text-fifo-critical">{(c.getValue() as string) ?? ""}</span> },
  ];

  const auditCols: ColumnDef<AuditLog, unknown>[] = [
    { accessorKey: "created_at", header: "Time", cell: (c) => fmtTime(c.getValue() as string) },
    { accessorKey: "action", header: "Action", cell: (c) => String(c.getValue() ?? "—") },
    { accessorKey: "table_name", header: "Table", cell: (c) => String(c.getValue() ?? "—") },
    { accessorKey: "record_id", header: "Record", cell: (c) => String(c.getValue() ?? "—") },
    { accessorKey: "new_value", header: "New value", cell: (c) => <code className="text-xs">{JSON.stringify(c.getValue() ?? {})}</code> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-metaforge-navy">Admin</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Sync control, logs, and user management</p>
      </div>

      {/* Sync control */}
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-metaforge-navy">Google Sheets sync</p>
            <p className="text-sm text-muted-foreground">Last sync: {fmtTime(lastSync)}</p>
          </div>
          <Button onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? "Syncing…" : "Run Sync Now"}
          </Button>
        </div>
        {msg && (
          <div className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${msg.ok ? "bg-fifo-fresh/10 text-fifo-fresh" : "bg-fifo-critical/10 text-fifo-critical"}`}>
            {msg.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {msg.text}
          </div>
        )}
      </div>

      {/* Users */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Users</h2>
        <div className="overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-3 py-2 font-medium text-metaforge-navy">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      className="rounded-md border px-2 py-1"
                      defaultValue={u.role}
                      onChange={async (e) => {
                        await setUserRole(u.id, e.target.value as "admin" | "viewer");
                        router.refresh();
                      }}
                    >
                      <option value="viewer">viewer</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={async () => { await setUserActive(u.id, !u.is_active); router.refresh(); }}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${u.is_active ? "bg-fifo-fresh/15 text-fifo-fresh" : "bg-slate-200 text-slate-600"}`}
                    >
                      {u.is_active ? "active" : "inactive"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sync logs */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Sync logs</h2>
        <DataTable columns={logCols} data={logs} searchPlaceholder="Search logs…" exportFilename="sync-logs" />
      </div>

      {/* Audit logs */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Audit logs</h2>
        <DataTable columns={auditCols} data={audits} searchPlaceholder="Search audit…" exportFilename="audit-logs" />
      </div>
    </div>
  );
}
