import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, ClipboardCheck, HeartPulse, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import type { AdminAnalytics, AdminOverview } from "../../../Member 2/src/types/admin";
import { browserDatabaseKey, browserDemo, demoFetch } from "../services/demoTransport";

const repository = "https://github.com/ashutoshsahu12/Care-loop";
const stages = [
  { role: "worker", label: "Care coordinator", title: "Give the result an owner", text: "Open Screenings and add a synthetic result for Kavita Sundaram. Create a referral and select Dr. Neha Verma as the receiving clinician." },
  { role: "doctor", label: "Doctor", title: "Accept the handoff", text: "Open Referrals and accept the new referral. Switch back to the coordinator to schedule a linked visit, record attendance, and complete a follow-up. Return as the doctor to verify closure with an evidence note." },
  { role: "patient", label: "Patient", title: "See what happened", text: "Open My case to see the current status and timeline. In Notifications, acknowledge a result and use View case details to open the case linked to that message." },
  { role: "admin", label: "Administrator", title: "Spot a case at risk", text: "Open Escalations and find CL-P-1006, a seeded critical case with a referral still awaiting acceptance. In Care outcomes, check the figures calculated from the same records." },
];

async function metric<T>(path: string): Promise<T> {
  const response = await demoFetch(new URL(path, window.location.origin), {
    headers: { Authorization: "Bearer usr-admin-1" },
  });
  if (!response.ok) throw new Error("The synthetic metrics could not be loaded.");
  return response.json() as Promise<T>;
}

export function JudgeDemo() {
  const metrics = useQuery({
    queryKey: ["judge-metrics"],
    enabled: browserDemo,
    staleTime: 0,
    queryFn: async () => {
      const [overview, analytics] = await Promise.all([
        metric<AdminOverview>("/api/admin/overview"),
        metric<AdminAnalytics>("/api/admin/analytics"),
      ]);
      return { overview, analytics };
    },
  });

  return <main className="judge-page">
    <nav className="judge-nav" aria-label="Demo navigation">
      <Link className="brand" to="/"><span className="brand-mark"><HeartPulse size={19} /></span>careloop<span className="brand-dot">.</span></Link>
      <a href={repository + "/actions"}>Verification runs ↗</a>
    </nav>
    <header className="judge-intro">
      <div className="eyebrow">FUTURE HEALTH DIGITAL INNOVATION CHALLENGE · POPULATION HEALTH</div>
      <h1>Closing the screening-to-care loop</h1>
      <p>CARELOOP gives each actionable screening result an owner, a next step, and a case history. Try the same case across four roles and see who acts when a referral stalls.</p>
      <p className="judge-note"><ShieldCheck size={18} /> {browserDemo
        ? "Synthetic records only. Changes stay in this browser tab and survive refreshes. Use the role links in this tab to share the same case."
        : "Synthetic records only. Use the connected local backend for a shared case across roles."}</p>
    </header>

    <section aria-labelledby="judge-walkthrough">
      <h2 id="judge-walkthrough">Walk through a case</h2>
      <ol className="judge-grid">{stages.map(stage => <li key={stage.role}>
        <div className="eyebrow">{stage.label}</div>
        <h3>{stage.title}</h3><p>{stage.text}</p>
        <Link className="text-link" to={`/login?role=${stage.role}`}>Open as {stage.label.toLowerCase()} <ArrowRight size={16} /></Link>
      </li>)}</ol>
    </section>

    {browserDemo && <section aria-labelledby="judge-metrics">
      <h2 id="judge-metrics"><Activity size={22} /> Simulated cohort metrics</h2>
      {metrics.isPending && <p role="status">Calculating metrics from the demo records…</p>}
      {metrics.isError && <p role="alert">Metrics could not be loaded. <button className="btn btn-sm" onClick={() => void metrics.refetch()}>Retry</button></p>}
      {metrics.data && <dl className="judge-metrics">
        <div><dt>Verified closures</dt><dd>{metrics.data.overview.completedCases} of {metrics.data.overview.totalCases}</dd></div>
        <div><dt>Unresolved cases</dt><dd>{metrics.data.analytics.unresolvedCases}</dd></div>
        <div><dt>Appointment attendance</dt><dd>{metrics.data.analytics.appointmentAttendanceRate}%</dd><small>Attended ÷ attended or missed visits</small></div>
      </dl>}
      <p>Calculated from fictional records in this tab. These figures illustrate how a pilot would measure follow-through.</p>
    </section>}

    <section className="judge-evidence" aria-labelledby="judge-evidence">
      <h2 id="judge-evidence"><ClipboardCheck size={22} /> Verification and pilot plan</h2>
      <p>The connected workflow is exercised in Chromium across all four roles. Backend tests cover cross-case access, overdue escalations, and evidence requirements at closure.</p>
      <p>A proposed pilot would start with one clinic and one screening pathway. The clinic would agree on escalation deadlines and measure verified closure, overdue cases, and time to consultation against its baseline. Real use requires clinical review, identity controls and data governance.</p>
      <a className="text-link" href={repository + "/blob/main/docs/judge-demo.md"}>Read the technical evidence and pilot plan <ArrowRight size={16} /></a>
    </section>
    {browserDemo && <section className="judge-reset">
      <button className="btn btn-sm" onClick={() => {
        if (!window.confirm("Discard changes in this tab and reload the original synthetic cases?")) return;
        sessionStorage.removeItem(browserDatabaseKey);
        window.location.reload();
      }}>Reset synthetic cases</button>
    </section>}
  </main>;
}
