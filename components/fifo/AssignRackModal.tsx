"use client";

import { useState } from "react";
import { Loader2, MapPin, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assignRack, retryWriteBack } from "@/app/(app)/fifo-board/actions";

export function AssignRackModal({
  item, knownRacks, onClose, onAssigned,
}: {
  item: { coil_number: string; rm_code: string | null; location_code: string | null };
  knownRacks: string[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [code, setCode] = useState(item.location_code ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; writeback: boolean; message: string } | null>(null);

  async function submit() {
    if (!code.trim()) return;
    setBusy(true);
    const r = await assignRack(item.coil_number, code, item.rm_code);
    setResult(r as any);
    setBusy(false);
    if (r.ok) onAssigned(); // refresh board now; assignment is saved
  }

  async function retry() {
    setBusy(true);
    const r = await retryWriteBack(item.coil_number, code, item.rm_code);
    setResult((prev) => (prev ? { ...prev, writeback: r.ok, message: r.message } : prev));
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <button onClick={onClose} className="absolute right-3 top-3 text-muted-foreground hover:text-metaforge-navy">
          <X className="h-4 w-4" />
        </button>
        <h2 className="flex items-center gap-2 text-base font-semibold text-metaforge-navy">
          <MapPin className="h-4 w-4" /> Assign rack
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {item.coil_number} · {item.rm_code ?? "—"}
        </p>

        <label className="mt-4 block text-sm font-medium text-metaforge-navy">Location code</label>
        <Input
          list="known-racks"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. R12-C3"
          className="mt-1"
          disabled={busy}
        />
        <datalist id="known-racks">
          {knownRacks.map((r) => <option key={r} value={r} />)}
        </datalist>

        {result && (
          <div className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${result.writeback ? "bg-fifo-fresh/10 text-fifo-fresh" : "bg-fifo-aging/10 text-amber-700"}`}>
            {result.writeback ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <div>
              <p>{result.message}</p>
              {result.ok && !result.writeback && (
                <button onClick={retry} disabled={busy} className="mt-1 font-semibold underline">
                  Retry sheet write-back
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>{result?.ok ? "Done" : "Cancel"}</Button>
          {!result?.ok && (
            <Button size="sm" onClick={submit} disabled={busy || !code.trim()}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Assign
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
