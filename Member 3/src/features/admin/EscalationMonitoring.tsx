import { useEffect, useState } from "react";
import { AlertList } from "./components/AlertList";
import { adminService } from "./services/adminService";
import type { EscalationRecord } from "../../types/admin";

export function EscalationMonitoring() {
  const [alerts, setAlerts] = useState<EscalationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminService.getEscalations()
      .then((data) => { if (active) setAlerts(data); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load escalations.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-slate-950">Escalation monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">
          Prioritise overdue referrals, missed appointments, unacknowledged notifications and unresolved cases.
        </p>
      </header>
      {error ? <p className="text-sm text-rose-700" role="alert">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Loading escalations…</p> : <AlertList alerts={alerts} />}
    </main>
  );
}
