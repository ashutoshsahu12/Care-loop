import { useEffect, useState } from "react";
import { AnalyticsCharts } from "./components/AnalyticsCharts";
import { StatCard } from "./components/StatCard";
import { adminService } from "./services/adminService";
import type { AdminAnalytics } from "../../types/admin";

function percentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

export function Analytics() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminService.getAnalytics()
      .then((data) => { if (active) setAnalytics(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load analytics.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics & reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Measure whether screening cases progress through referral, consultation and verified closure.
        </p>
      </header>

      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading analytics…</p> : null}
      {analytics ? (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard label="Referral completion" value={percentage(analytics.referralCompletionRate)} />
            <StatCard label="Appointment attendance" value={percentage(analytics.appointmentAttendanceRate)} />
            <StatCard label="Notification acknowledgement" value={percentage(analytics.notificationAcknowledgementRate)} />
            <StatCard label="Average time to consultation" value={`${analytics.averageTimeToConsultationHours} hrs`} />
            <StatCard label="Verified closure" value={percentage(analytics.verifiedClosureRate)} tone="success" />
            <StatCard label="Unresolved cases" value={analytics.unresolvedCases} tone="warning" />
          </section>
          <AnalyticsCharts
            referralTrend={analytics.referralCompletionTrend}
            attendanceTrend={analytics.appointmentAttendanceTrend}
          />
        </>
      ) : null}
    </main>
  );
}
