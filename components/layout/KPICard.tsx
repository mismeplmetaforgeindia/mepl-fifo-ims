import { cn } from "@/lib/utils";

type Accent = "navy" | "critical" | "pending";

const accentText: Record<Accent, string> = {
  navy: "text-metaforge-navy",
  critical: "text-fifo-critical",
  pending: "text-fifo-aging",
};

// Reused by the FIFO board KPI strip (TOTAL LOTS / AVAILABLE STOCK /
// CRITICAL AGING / PENDING RACK). Presentational only — no calculation.
export function KPICard({
  label,
  value,
  subtitle,
  accent = "navy",
}: {
  label: string;
  value: string;
  subtitle?: string;
  accent?: Accent;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", accentText[accent])}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
