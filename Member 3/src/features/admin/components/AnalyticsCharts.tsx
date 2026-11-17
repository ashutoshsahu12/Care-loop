import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeSeriesPoint } from "../../../types/admin";

export interface AnalyticsChartsProps {
  referralTrend: TimeSeriesPoint[];
  attendanceTrend: TimeSeriesPoint[];
}

interface TrendChartProps {
  title: string;
  data: TimeSeriesPoint[];
  valueLabel: string;
}

function TrendChart({ title, data, valueLabel }: TrendChartProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      {data.length === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-slate-500">
          No trend data available yet.
        </p>
      ) : (
        <div className="h-56 w-full" role="img" aria-label={title}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="value"
                name={valueLabel}
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function AnalyticsCharts({
  referralTrend,
  attendanceTrend,
}: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <TrendChart
        title="Referral completion trend"
        data={referralTrend}
        valueLabel="Completed referrals"
      />
      <TrendChart
        title="Appointment attendance trend"
        data={attendanceTrend}
        valueLabel="Attended appointments"
      />
    </div>
  );
}
