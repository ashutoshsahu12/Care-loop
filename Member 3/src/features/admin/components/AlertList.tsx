import type { EscalationRecord } from "../../../types/admin";

export interface AlertListProps {
  alerts: EscalationRecord[];
  onSelectCase?: (caseId: string) => void;
  emptyMessage?: string;
}

const priorityStyles: Record<EscalationRecord["priority"], string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-amber-100 text-amber-800",
  critical: "bg-rose-100 text-rose-800",
};

export function AlertList({
  alerts,
  onSelectCase,
  emptyMessage = "No active escalations.",
}: AlertListProps) {
  if (alerts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {alerts.map((alert) => (
        <li key={alert.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">
                {alert.patientReference}
                <span className="ml-2 font-normal text-slate-500">
                  {alert.type.replaceAll("_", " ")}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-600">{alert.reason}</p>
              <p className="mt-1 text-xs text-slate-500">
                Responsible: {alert.responsiblePerson ?? "Not assigned"} ·
                {" "}{alert.overdueDays} overdue day(s)
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[alert.priority]}`}
            >
              {alert.priority}
            </span>
          </div>
          {onSelectCase ? (
            <button
              type="button"
              className="mt-3 text-sm font-medium text-blue-700 hover:underline"
              onClick={() => onSelectCase(alert.caseId)}
            >
              View case
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
