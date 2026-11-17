import type { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: number | string;
  helperText?: string;
  icon?: ReactNode;
  tone?: "default" | "warning" | "success" | "danger";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "border-slate-200 bg-white text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  danger: "border-rose-200 bg-rose-50 text-rose-950",
};

export function StatCard({
  label,
  value,
  helperText,
  icon,
  tone = "default",
}: StatCardProps) {
  return (
    <article
      className={`flex min-h-32 flex-col justify-between rounded-xl border p-4 shadow-sm ${toneClasses[tone]}`}
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium opacity-75">{label}</h2>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
      </div>
      <div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        {helperText ? (
          <p className="mt-1 text-xs opacity-70">{helperText}</p>
        ) : null}
      </div>
    </article>
  );
}
