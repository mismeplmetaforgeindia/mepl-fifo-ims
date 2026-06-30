export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-metaforge-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Company-wide stock visibility · Khatwad plant
      </p>

      <div className="mt-6 rounded-xl border border-dashed bg-white p-8 text-center">
        <p className="text-sm font-medium text-metaforge-navy">Foundation ready</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Auth, schema, RLS and the app shell are live. The DASHBOARD data table
          renders here once the sheet sync is connected in Phase 2, mirroring the
          sheet exactly with the Physical Stock column pinned and highlighted.
        </p>
      </div>
    </div>
  );
}
