import { useEffect, useState } from "react";
import { AlertList } from "./components/AlertList";
import { StatCard } from "./components/StatCard";
import { adminService } from "./services/adminService";
import type { AdminOverview, EscalationRecord } from "../../types/admin";

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [alerts, setAlerts] = useState<EscalationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([adminService.getOverview(), adminService.getEscalations()])
      .then(([overviewData, escalationData]) => {
        if (!active) return;
        setOverview(overviewData);
        setAlerts(escalationData.slice(0, 5));
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading admin dashboard…</p>;
  }

  if (error || !overview) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
        {error ?? "Dashboard data is unavailable."}
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Overview of screening-to-care activity and follow-up workload.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Key performance indicators">
        <StatCard label="Total patients" value={overview.totalPatients} />
        <StatCard label="Screening cases" value={overview.totalCases} />
        <StatCard label="Pending cases" value={overview.pendingCases} tone="warning" />
        <StatCard label="Completed cases" value={overview.completedCases} tone="success" />
        <StatCard label="Overdue cases" value={overview.overdueCases} tone="danger" />
        <StatCard label="Unassigned cases" value={overview.unassignedCases} tone="warning" />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recent escalations</h2>
          <p className="text-sm text-slate-500">Items requiring administrative attention.</p>
        </div>
        <AlertList alerts={alerts} />
      </section>
    </main>
  );
}
