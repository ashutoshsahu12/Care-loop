import type { CaseRecord } from "../../../types/admin";

export interface CaseTableProps {
  cases: CaseRecord[];
  onSelectCase?: (caseId: string) => void;
  emptyMessage?: string;
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Invalid date"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function CaseTable({
  cases,
  onSelectCase,
  emptyMessage = "No cases match the current filters.",
}: CaseTableProps) {
  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Patient reference</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="px-4 py-3 font-semibold">Care worker</th>
            <th scope="col" className="px-4 py-3 font-semibold">Next action</th>
            <th scope="col" className="px-4 py-3 font-semibold">Due date</th>
            <th scope="col" className="px-4 py-3 font-semibold">Last activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {cases.map((record) => (
            <tr key={record.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {onSelectCase ? (
                  <button type="button" className="text-teal-700 hover:underline focus-visible:underline"
                    onClick={() => onSelectCase(record.id)}>{record.patientReference}</button>
                ) : record.patientReference}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  {record.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {record.assignedCareWorker ?? "Unassigned"}
              </td>
              <td className="px-4 py-3 text-slate-600">{record.nextAction}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatDate(record.dueDate)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatDate(record.lastActivityAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
