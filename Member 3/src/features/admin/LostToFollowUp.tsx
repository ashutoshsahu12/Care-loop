import { useEffect, useState } from "react";
import { adminService } from "./services/adminService";
import type { AtRiskCase } from "../../types/admin";

const riskStyles: Record<AtRiskCase["riskLevel"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  critical: "bg-rose-100 text-rose-800",
};

export function LostToFollowUp() {
  const [records, setRecords] = useState<AtRiskCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminService.getAtRiskCases()
      .then((data) => { if (active) setRecords(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load at-risk cases.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Lost-to-follow-up monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Rule-based follow-up flags to help teams identify cases needing attention.
        </p>
      </header>

      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading at-risk cases…</p>
      ) : records.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No at-risk cases are currently reported.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Patient reference</th>
                <th className="px-4 py-3">Reason flagged</th>
                <th className="px-4 py-3">Overdue days</th>
                <th className="px-4 py-3">Care worker</th>
                <th className="px-4 py-3">Suggested next action</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.caseId}>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{record.patientReference}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <ul className="list-inside list-disc">
                      {record.reasons.map((reason) => <li key={reason}>{reason.replaceAll("_", " ")}</li>)}
                    </ul>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{record.overdueDays}</td>
                  <td className="px-4 py-3 text-slate-600">{record.assignedCareWorker ?? "Unassigned"}</td>
                  <td className="px-4 py-3 text-slate-600">{record.suggestedNextAction}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskStyles[record.riskLevel]}`}>
                      {record.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
