import { useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { Analytics } from "./Analytics";
import { CaseMonitoring } from "./CaseMonitoring";
import { EscalationMonitoring } from "./EscalationMonitoring";
import { LostToFollowUp } from "./LostToFollowUp";
import { adminService } from "./services/adminService";

type Section = "dashboard" | "cases" | "escalations" | "at-risk" | "analytics";

const navigation: Array<{ id: Section; label: string; description: string; symbol: string }> = [
  { id: "dashboard", label: "Overview", description: "Dashboard summary", symbol: "▦" },
  { id: "cases", label: "Case monitoring", description: "All screening cases", symbol: "▤" },
  { id: "escalations", label: "Escalations", description: "Items needing attention", symbol: "⚑" },
  { id: "at-risk", label: "Lost to follow-up", description: "At-risk case list", symbol: "◎" },
  { id: "analytics", label: "Analytics", description: "Performance and outcomes", symbol: "▥" },
];

const sectionTitles: Record<Section, string> = {
  dashboard: "Overview",
  cases: "Case monitoring",
  escalations: "Escalation monitoring",
  "at-risk": "Lost-to-follow-up monitoring",
  analytics: "Analytics & reports",
};

/**
 * Standalone entry component for the Member 3 admin feature.
 * Import and render <AdminApp /> from the host application when integration
 * is agreed. This file does not change or assume the host app's router.
 */
export function AdminApp() {
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function renderSection() {
    switch (activeSection) {
      case "cases":
        return <CaseMonitoring />;
      case "escalations":
        return <EscalationMonitoring />;
      case "at-risk":
        return <LostToFollowUp />;
      case "analytics":
        return <Analytics />;
      case "dashboard":
      default:
        return <AdminDashboard />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Admin navigation"
        >
          <div className="border-b border-slate-100 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-700 text-xl font-bold text-white">
                C
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">CARELOOP</p>
                <p className="text-xs text-slate-500">Admin workspace</p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-6">
            <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Workspace
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const selected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      setMobileMenuOpen(false);
                    }}
                    aria-current={selected ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? "bg-teal-50 text-teal-800 ring-1 ring-teal-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg shadow-sm ring-1 ring-slate-200">
                      {item.symbol}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-xs opacity-65">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-700">Member 3 module</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Administrative monitoring and outcome visibility for the screening-to-care pathway.
              </p>
            </div>
          </div>
        </aside>

        {mobileMenuOpen ? (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation"
              >
                ☰
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{sectionTitles[activeSection]}</p>
                <p className="hidden text-xs text-slate-500 sm:block">Closing the screening-to-care loop</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${adminService.isDemoMode() ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
                {adminService.isDemoMode() ? "DEMO DATA" : "LIVE API"}
              </span>
              <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 sm:flex">
                AD
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-7 lg:p-8">
            <div className="mx-auto w-full max-w-[1320px]">{renderSection()}</div>
          </div>

          <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
            CARELOOP · Admin, Monitoring & Analytics · Synthetic demonstration workspace
          </footer>
        </div>
      </div>
    </div>
  );
}

export default AdminApp;
