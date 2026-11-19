import { useEffect, useState } from "react";
import { CaseTable } from "./components/CaseTable";
import { adminService } from "./services/adminService";
import type { CaseFilters, CaseRecord, CaseStatus, Priority } from "../../types/admin";

export function CaseMonitoring() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [filters, setFilters] = useState<CaseFilters>({ status: "all", priority: "all", search: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminService.getCases(filters)
      .then((data) => { if (active) setCases(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load cases.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function updateFilter<K extends keyof CaseFilters>(key: K, value: CaseFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Case monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">Review case status, ownership, next actions and due dates.</p>
      </header>

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3" aria-label="Case filters">
        <label className="text-sm font-medium text-slate-700">
          Search
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            value={filters.search ?? ""}
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Patient reference or next action"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Status
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            value={filters.status ?? "all"}
            onChange={(event) => updateFilter("status", event.target.value as CaseStatus | "all")}
          >
            <option value="all">All statuses</option>
            <option value="screening">Screening</option>
            <option value="referred">Referred</option>
            <option value="appointment_scheduled">Appointment scheduled</option>
            <option value="in_care">In care</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Priority
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
            value={filters.priority ?? "all"}
            onChange={(event) => updateFilter("priority", event.target.value as Priority | "all")}
          >
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </section>

      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading cases…</p> : <CaseTable cases={cases} />}
    </main>
  );
}
