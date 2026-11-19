import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, CheckCheck, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, ClipboardCheck, ClipboardList, Clock3, Command, Download, FileHeart, FilePlus2, Filter,
  HeartPulse, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Stethoscope, UserRound, Users, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { appointments as demoAppointments, chartData, distributionData } from "./mocks/data";
import { appointmentService } from "./services/appointmentService";
import { api } from "./services/api";
import { isDemoMode } from "./services/api";
import { authService, demoUsers } from "./services/authService";
import { caseService } from "./services/caseService";
import { followupService } from "./services/followupService";
import { notificationService } from "./services/notificationService";
import { patientService } from "./services/patientService";
import { referralService, type Referral } from "./services/referralService";
import { screeningService } from "./services/screeningService";
import { teamMembers, type TeamMember } from "./mocks/team";
import type { Appointment, CaseStatus, CaseTimelineEvent, FollowUp, Patient, Role, User } from "./types";
import { Avatar, Badge, Card, EmptyState, ErrorState, LoadingState, Modal, PageHeader } from "./components/ui";
import { Button } from "./components/ui/button";
import { AdminDashboard as CareAdminDashboard, CaseMonitoring, EscalationMonitoring, LostToFollowUp, Analytics as CareAnalytics } from "../../Member 3/src/features/admin";

type AuthContextValue = { user: User | null; signIn: (user: User) => void; signOut: () => Promise<void> };
import { createContext, useContext } from "react";
const AuthContext = createContext<AuthContextValue | null>(null);
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthContext must be provided.");
  return context;
};

function refreshPatientCase(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["patient-case"] }),
    queryClient.invalidateQueries({ queryKey: ["case-timeline"] }),
  ]);
}

const roleLabels: Record<Role, string> = { admin: "Administrator", doctor: "Doctor", worker: "Care coordinator", patient: "Patient" };
const roleHome = (role: Role) => authService.roleHome(role);
const pathTitles: Record<string, string> = {
  dashboard: "Overview", patients: "Patients", team: "Care team", screenings: "Screening records", followups: "Follow-ups",
  appointments: "Appointments", referrals: "Referrals", notifications: "Notifications", analytics: "Analytics & reports",
  "my-case": "My care case",
  "care-monitoring": "Care-loop overview", "care-cases": "Case monitoring", "care-escalations": "Escalations", "care-at-risk": "Lost to follow-up", "care-outcomes": "Care outcomes",
};

function ProtectedRoute({ allowed }: { allowed?: Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (allowed && !allowed.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return <Outlet />;
}

function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const notifyQuery = useQuery({ queryKey: ["notifications", user?.role, user?.patientId], queryFn: () => notificationService.list(user?.role, user?.patientId) });
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (user && user.role !== "patient") setSearchOpen((current) => !current);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [user?.role]);
  if (!user) return <Navigate to="/login" replace />;
  const isPatient = user.role === "patient";
  const unreadNotifications = notifyQuery.data?.filter((item) => item.unread).length || 0;
  const sections = isPatient
    ? [{ label: "YOUR CARE", items: [{ label: "Overview", path: roleHome("patient"), icon: LayoutDashboard }, { label: "My case", path: "/my-case", icon: FileHeart }, { label: "My appointments", path: "/appointments", icon: CalendarDays }, { label: "Notifications", path: "/notifications", icon: Bell }] }]
    : [
      { label: "WORKSPACE", items: [{ label: "Overview", path: roleHome(user.role), icon: LayoutDashboard }, { label: "Patients", path: "/patients", icon: Users }, ...(user.role === "admin" ? [{ label: "Care team", path: "/team", icon: Stethoscope }] : []), { label: "Screening records", path: "/screenings", icon: ClipboardList }, { label: "Follow-ups", path: "/followups", icon: ClipboardCheck }, { label: "Appointments", path: "/appointments", icon: CalendarDays }, { label: "Referrals", path: "/referrals", icon: FileHeart }] },
      ...(user.role === "admin" ? [{ label: "INSIGHTS", items: [{ label: "Analytics & reports", path: "/analytics", icon: Activity }, { label: "Care-loop overview", path: "/care-monitoring", icon: LayoutDashboard }, { label: "Case monitoring", path: "/care-cases", icon: ClipboardCheck }, { label: "Escalations", path: "/care-escalations", icon: Bell }, { label: "At-risk cases", path: "/care-at-risk", icon: ShieldCheck }, { label: "Care outcomes", path: "/care-outcomes", icon: Activity }] }] : []),
      { label: "ACCOUNT", items: [{ label: "Notifications", path: "/notifications", icon: Bell }] },
    ];
  const currentTitle = pathTitles[location.pathname.split("/")[1]] || (location.pathname.startsWith("/patient/") ? "Patient details" : "Overview");
  return <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-sidebar-open" : ""}`}>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <aside className="sidebar">
      <div className="brand-row"><Link className="brand" to={roleHome(user.role)}><span className="brand-mark"><HeartPulse size={19} /></span>{!collapsed && <span>careloop<span className="brand-dot">.</span></span>}</Link><button className="collapse-btn" aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}><ChevronLeft size={17} /></button></div>
      {!collapsed && <div className="workspace-switch"><span className="workspace-icon"><ShieldCheck size={17} /></span><span className="workspace-copy"><strong>Bayview Health</strong><small>Care network</small></span><ChevronDown size={14} /></div>}
      <nav className="side-nav">
        {sections.map((section) => <div className="nav-section" key={section.label}>
          {!collapsed && <div className="nav-section-label">{section.label}</div>}
          {section.items.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path || (label === "Patients" && location.pathname.startsWith("/patient/")) || (path === roleHome(user.role) && location.pathname === path);
            return <Link key={label} to={path} onClick={() => setMobileOpen(false)} className={`nav-link ${active ? "active" : ""}`} title={collapsed ? label : undefined}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span>{label === "Follow-ups" && <span className="nav-count">8</span>}{label === "Notifications" && unreadNotifications > 0 && <span className="nav-count">{unreadNotifications}</span>}
            </Link>;
          })}
        </div>)}
      </nav>
      <button className="sidebar-user" onClick={() => setProfileOpen(!profileOpen)}>
        <Avatar initials={user.initials} size="sm" /><span className="sidebar-user-name"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span><MoreHorizontal size={17} />
      </button>
    </aside>
    <div className="main-wrap">
      <header className="topbar">
        <button className="mobile-menu icon-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
        <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{currentTitle}</strong></div>
        <div className="topbar-actions">
          {user.role !== "patient" && <button className="search-trigger" onClick={() => setSearchOpen(!searchOpen)}><Search size={16} /><span>Search patients, records…</span><kbd>⌘ K</kbd></button>}
          <Link className="top-icon-btn notification-btn" to="/notifications" aria-label="Notifications"><Bell size={18} />{unreadNotifications > 0 && <i />}</Link>
          <button className="top-user" onClick={() => setProfileOpen(!profileOpen)}><Avatar initials={user.initials} size="sm" /><ChevronDown size={14} /></button>
          {profileOpen && <div className="profile-popover"><div className="popover-user"><Avatar initials={user.initials} /><span><b>{user.name}</b><small>{roleLabels[user.role]}</small></span></div><button onClick={async () => { await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button></div>}
        </div>
      </header>
      <main className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>CARELOOP <span>·</span> Closing the screening-to-care loop</span><span>Synthetic demo data · no real patient information <ShieldCheck size={13} /></span></footer>
    </div>
    {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
  </div>;
}

function GlobalSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const filtered = data.filter((p) => `${p.name} ${p.id} ${p.screening}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  return <div className="search-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="search-modal"><div className="search-input-wrap"><Search size={19} /><input autoFocus placeholder="Search patients, records, or pages…" value={query} onChange={(e) => setQuery(e.target.value)} /><button className="kbd-close" onClick={onClose}>ESC</button></div>
      <div className="search-results">{query ? filtered.length ? filtered.map((p) => <button key={p.id} onClick={() => { navigate(`/patient/${p.id}`); onClose(); }}><Avatar initials={p.initials} size="sm" /><span><b>{p.name}</b><small>{p.id} · {p.screening}</small></span><Badge tone={statusTone(p.status)}>{p.status}</Badge><ArrowRight size={15} /></button>) : <EmptyState title="No matches found" description="Try searching by patient name or ID." /> : <p className="search-hint"><Command size={15} /> Search by patient name, ID, or screening type</p>}</div>
      <div className="search-footer">PATIENTS <span>Use ↑↓ to navigate · Enter to open</span></div>
    </div>
  </div>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try { const saved = localStorage.getItem("careloop.demoUser"); return saved ? JSON.parse(saved) as User : null; } catch { return null; }
  });
  const signIn = (next: User) => { setUser(next); localStorage.setItem("careloop.demoUser", JSON.stringify(next)); };
  const signOut = async () => { await authService.logout(); setUser(null); localStorage.removeItem("careloop.demoUser"); };
  return <AuthContext.Provider value={{ user, signIn, signOut }}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}><Route element={<AppLayout />}>
          <Route element={<ProtectedRoute allowed={["doctor"]} />}><Route path="/dashboard/doctor" element={<DashboardPage />} /></Route>
          <Route element={<ProtectedRoute allowed={["worker"]} />}><Route path="/dashboard/worker" element={<DashboardPage />} /></Route>
          <Route element={<ProtectedRoute allowed={["patient"]} />}><Route path="/dashboard/patient" element={<PatientDashboard />} /></Route>
          <Route element={<ProtectedRoute allowed={["patient"]} />}><Route path="/my-case" element={<PatientCasePage />} /></Route>
          <Route element={<ProtectedRoute allowed={["admin", "doctor", "worker"]} />}>
            <Route path="/patients" element={<PatientsPage />} />
            <Route element={<ProtectedRoute allowed={["admin"]} />}><Route path="/team" element={<CareTeamPage />} /></Route>
            <Route path="/patient/:id" element={<PatientDetailsPage />} />
            <Route path="/screenings" element={<ScreeningsPage />} />
            <Route path="/screening/:id" element={<ScreeningDetailsPage />} />
            <Route path="/followups" element={<FollowUpsPage />} />
            <Route path="/referrals" element={<ReferralsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowed={["admin"]} />}><Route path="/dashboard/admin" element={<DashboardPage />} /><Route path="/analytics" element={<AnalyticsPage />} /><Route path="/care-monitoring" element={<CareAdminDashboard />} /><Route path="/care-cases" element={<CaseMonitoring />} /><Route path="/care-escalations" element={<EscalationMonitoring />} /><Route path="/care-at-risk" element={<LostToFollowUp />} /><Route path="/care-outcomes" element={<CareAnalytics />} /></Route>
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
      </Route></Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthContext.Provider>;
}

function LandingPage() {
  const { user } = useAuth();
  return <div className="landing-page"><nav className="landing-nav"><Link className="brand" to="/"><span className="brand-mark"><HeartPulse size={19} /></span><span>careloop<span className="brand-dot">.</span></span></Link><div><a href="#how-it-works">How it works</a><a href="#care-teams">For care teams</a><Link to="/login" className="landing-login">Sign in</Link><Button asChild className="btn btn-primary btn-sm"><Link to="/login">Try the demo <ArrowRight size={15} /></Link></Button></div></nav>
    <section className="hero"><div className="hero-copy"><div className="hero-pill"><span /> BUILT FOR CONTINUITY OF CARE</div><h1>From screening<br />to care, <em>together.</em></h1><p>Every abnormal result deserves a next step. CARELOOP connects care teams and patients to make sure no one falls through the cracks.</p><div className="hero-buttons"><Link to={user ? roleHome(user.role) : "/login"} className="btn btn-primary">Explore the platform <ArrowRight size={17} /></Link><a href="#how-it-works" className="text-link">See how it works <ChevronRight size={16} /></a></div><div className="hero-proof"><div className="proof-avatars"><Avatar initials="P" size="sm" /><Avatar initials="CW" size="sm" /><Avatar initials="D" size="sm" /></div><span>One connected case history for <b>patients and care teams</b></span></div></div>
      <div className="hero-art"><div className="hero-grid" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="hero-center"><span className="brand-mark"><HeartPulse size={27} /></span></div>
        <div className="floating-card journey-float"><div className="float-head"><span className="float-icon"><Activity size={16} /></span><span><b>Care journey</b><small>Olivia Rhye · CASE-2048</small></span><Badge tone="blue">Appointment scheduled</Badge></div><div className="mini-steps"><span className="done"><Check size={12} /></span><i /><span className="done"><Check size={12} /></span><i /><span className="current"><span /></span><i /><span /></div><div className="float-progress"><span>Recorded case events</span><b>8</b></div><div className="float-next"><Clock3 size={14} /><span>Next up: <b>Diagnostic ultrasound</b></span><strong>2:30 PM</strong></div></div>
        <div className="floating-card alert-float"><span className="alert-icon"><Bell size={16} /></span><span><b>Follow-up due</b><small>Ethan Brooks · 2 days overdue</small></span><ArrowRight size={15} /></div>
      </div>
    </section>
    <section className="proof-strip"><div><strong>One connected journey</strong><span>Every step visible, from screening to treatment.</span></div><div><strong>Clear ownership</strong><span>Care teams know what needs attention next.</span></div><div><strong>Documented closure</strong><span>Cases close only when care is confirmed.</span></div></section>
    <section className="landing-how" id="how-it-works"><div className="section-intro"><div className="eyebrow">CARE THAT CONNECTS</div><h2>Make every next step<br />count.</h2><p>A clear, accountable path from an abnormal result to documented care.</p></div><div className="how-grid">{[{ number: "01", title: "Find the signal", text: "Abnormal screening results are surfaced and assigned to the right care team." }, { number: "02", title: "Keep it moving", text: "Coordinate outreach, appointments, referrals, and follow-ups in one timeline." }, { number: "03", title: "Close with confidence", text: "Document completed care before a case is marked resolved." }].map((item) => <div className="how-card" key={item.number}><span>{item.number}</span><h3>{item.title}</h3><p>{item.text}</p><ArrowRight size={17} /></div>)}</div></section>
    <section className="landing-cta" id="care-teams"><div><span className="eyebrow">BETTER FOLLOW-THROUGH STARTS HERE</span><h2>Care shouldn't stop at a result.</h2><p>See how your team can bring screening and follow-up into one continuous loop.</p></div><Link to="/login" className="btn btn-dark">Open the demo <ArrowRight size={16} /></Link></section>
    <footer className="landing-footer"><Link className="brand" to="/"><span className="brand-mark"><HeartPulse size={17} /></span><span>careloop<span className="brand-dot">.</span></span></Link><span>Closing the screening-to-care loop.</span><span>Synthetic demo data · © 2026 CARELOOP</span></footer>
  </div>;
}

const loginSchema = z.object({ email: z.string().email("Enter a valid email address."), password: z.string().min(1, "Enter your password.") });
type LoginValues = z.infer<typeof loginSchema>;
function AuthPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [selectedDemo, setSelectedDemo] = useState(demoUsers[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: demoUsers[0].email, password: "" } });
  const chooseDemo = (account: User) => { setSelectedDemo(account); loginForm.setValue("email", account.email); setError(""); };
  const submitLogin = loginForm.handleSubmit(async (values) => {
    setBusy(true); setError("");
    try { const account = await authService.login(values.email, values.password); signIn(account); navigate(roleHome(account.role)); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "Sign-in failed. Please try again."); }
    finally { setBusy(false); }
  });
  return <div className="auth-page"><div className="auth-left"><Link className="brand" to="/"><span className="brand-mark"><HeartPulse size={19} /></span><span>careloop<span className="brand-dot">.</span></span></Link><div className="auth-message"><div className="eyebrow">CARE, CONNECTED</div><h1>Keep every<br />care journey<br /><em>moving forward.</em></h1><p>One place for your team to turn screening results into the care patients need.</p><div className="auth-mini-card"><div className="auth-mini-top"><span><Activity size={16} /> Care journey</span><Badge tone="teal">On track</Badge></div><div className="auth-mini-bar"><span /><span /><span /><span /><i /></div><small>Follow-up is coordinated every step of the way.</small></div></div><div className="auth-left-bottom"><ShieldCheck size={15} /> Your care information is protected</div></div>
    <div className="auth-right"><div className="auth-form-wrap"><Link to="/" className="back-home"><ChevronLeft size={15} /> Back to CARELOOP</Link><div className="auth-heading"><div className="eyebrow">DEMO ACCESS</div><h2>Sign in to CARELOOP</h2><p>Choose a demo role or sign in with your account.</p></div>
      <div className="demo-label"><span>DEMO ACCOUNTS</span><i /> <small>Choose a role to preview</small></div>
      <div className="demo-role-grid">{demoUsers.map((account) => <button key={account.role} className={`demo-role ${selectedDemo.role === account.role ? "selected" : ""}`} onClick={() => chooseDemo(account)}><Avatar initials={account.initials} size="sm" tone={account.role === "patient" ? "avatar-patient" : ""} /><span><b>{roleLabels[account.role]}</b><small>{account.email}</small></span>{selectedDemo.role === account.role && <Check size={15} />}</button>)}</div>
      <form onSubmit={submitLogin} className="form-stack login-form">
        <Field label="Email address" error={loginForm.formState.errors.email?.message}><input {...loginForm.register("email")} type="email" autoComplete="username" /></Field>
        <Field label="Password" error={loginForm.formState.errors.password?.message}><input {...loginForm.register("password")} type="password" placeholder="Enter any password for demo access" autoComplete="current-password" /></Field>
        <div className="demo-note"><Sparkles size={14} /> Demo mode: any password works. No password is stored.</div>
        {error && <div className="form-error">{error}</div>}<button className="btn btn-primary btn-full" disabled={busy}>{busy ? "Signing in…" : "Sign in to CARELOOP"} <ArrowRight size={16} /></button>
      </form>
      <div className="auth-switch">Demo identities use synthetic case data and do not create real accounts.</div><div className="auth-security"><ShieldCheck size={14} /> Secure access · Demo environment</div></div></div></div>;
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return <label className="form-field"><span>{label}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}

function MetricCard({ title, value, change, icon: Icon, tone, note }: { title: string; value: string; change?: string; icon: typeof Users; tone: string; note: string }) {
  return <Card className="metric-card"><div className="metric-top"><span>{title}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><div className="metric-value">{value}</div><div className="metric-bottom">{change && <span className="metric-change"><ArrowUpRight size={13} />{change}</span>}<span>{note}</span></div></Card>;
}

function DashboardPage() {
  const { user } = useAuth();
  const patientsQuery = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const followupQuery = useQuery({ queryKey: ["followups", user?.role], queryFn: () => followupService.list(user?.role) });
  const connectedAppointments = useQuery({
    queryKey: ["connected-appointments", user?.role],
    queryFn: () => appointmentService.list(user?.role),
    enabled: !isDemoMode,
  });
  const connectedOverview = useQuery({
    queryKey: ["connected-admin-overview"],
    queryFn: async () => (await api.get<{
      totalPatients: number; totalCases: number; pendingCases: number;
      completedCases: number; overdueCases: number;
    }>("/admin/overview")).data,
    enabled: !isDemoMode && user?.role === "admin",
  });
  if (patientsQuery.isLoading || followupQuery.isLoading) return <LoadingState />;
  if (patientsQuery.error || followupQuery.error) return <ErrorState error={(patientsQuery.error || followupQuery.error) instanceof Error ? ((patientsQuery.error || followupQuery.error) as Error).message : "Please try again."} onRetry={() => { void patientsQuery.refetch(); void followupQuery.refetch(); }} />;
  const list = patientsQuery.data || [];
  const role = user?.role || "admin";
  const isDoctor = role === "doctor";
  if (!isDemoMode) {
    if (connectedAppointments.isLoading || (role === "admin" && connectedOverview.isLoading)) {
      return <LoadingState />;
    }
    const connectedError = connectedAppointments.error || (role === "admin" ? connectedOverview.error : null);
    if (connectedError) {
      return <ErrorState error={connectedError instanceof Error ? connectedError.message : "Unable to load the connected dashboard."}
        onRetry={() => { void connectedAppointments.refetch(); if (role === "admin") void connectedOverview.refetch(); }} />;
    }
    const overview = connectedOverview.data;
    const active = list.filter(patient => patient.status !== "Closed");
    const overdue = list.filter(patient => patient.status === "Overdue");
    const completed = list.filter(patient => patient.status === "Closed");
    const pendingFollowups = (followupQuery.data || []).filter(item => item.status !== "Completed");
    const appts = (connectedAppointments.data || []).filter(item => item.status !== "Completed" && item.status !== "Missed");
    const totals = [
      { label: role === "admin" ? "Registered patients" : "Assigned patients", value: overview?.totalPatients ?? list.length, icon: Users, tone: "blue", note: "From current synthetic records" },
      { label: "Active cases", value: overview?.pendingCases ?? active.length, icon: Activity, tone: "teal", note: "Cases awaiting verified closure" },
      { label: "Overdue cases", value: overview?.overdueCases ?? overdue.length, icon: Clock3, tone: "amber", note: "Needs timely care-team action" },
      { label: "Verified closures", value: overview?.completedCases ?? completed.length, icon: CheckCheck, tone: "green", note: "Cases marked complete" },
    ];
    const statuses = [
      { label: "In progress", count: active.filter(p => p.status === "In progress" || p.status === "Awaiting patient").length },
      { label: "In care", count: active.filter(p => p.status === "In care").length },
      { label: "Referred / scheduled", count: active.filter(p => p.status === "Referred" || p.status === "Appointment scheduled").length },
      { label: "Overdue", count: overdue.length },
      { label: "Closed", count: completed.length },
    ];
    const maxCount = Math.max(1, ...statuses.map(item => item.count));
    return <div className="page-stack">
      <PageHeader eyebrow={`${roleLabels[role].toUpperCase()} WORKSPACE · ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" }).toUpperCase()}`}
        title={`Welcome, ${(user?.name || "care team").split(" ")[0]}`}
        description="Care coordination updates from the connected synthetic demo database."
        action={<button className="btn btn-secondary" onClick={() => window.print()}><Download size={15} /> Export report</button>} />
      <div className="demo-data-banner" role="note">Synthetic demo data · figures below are calculated from the current connected CARELOOP records.</div>
      <div className="metric-grid">{totals.map(item =>
        <MetricCard key={item.label} title={item.label} value={String(item.value)} icon={item.icon} tone={item.tone} note={item.note} />)}
      </div>
      <div className="dashboard-main-grid">
        <Card className="chart-card">
          <div className="card-heading"><div><h2>Current case status</h2><p>Snapshot of your visible patient cases</p></div><Link to={role === "admin" ? "/care-cases" : "/patients"} className="inline-link">View cases <ArrowRight size={14} /></Link></div>
          <div className="chart-summary"><div><span>Visible patients</span><b>{list.length}</b></div><div><span>Follow-up tasks open</span><b>{pendingFollowups.length}</b></div></div>
          <div className="space-y-3">{statuses.map(item =>
            <div key={item.label}>
              <div className="flex justify-between text-sm"><span>{item.label}</span><b>{item.count}</b></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${(item.count / maxCount) * 100}%` }} /></div>
            </div>)}
          </div>
        </Card>
        <Card className="attention-card"><div className="card-heading"><div><h2>Needs attention</h2><p>Cases with a pending next action</p></div><Link to="/patients" className="inline-link">View all <ArrowRight size={14} /></Link></div>
          <div className="attention-list">{active.slice(0, 4).map(patient =>
            <Link className="attention-item" key={patient.id} to={`/patient/${patient.id}`}>
              <Avatar initials={patient.initials} size="sm" /><span className="attention-copy"><b>{patient.name}</b><small>{patient.nextAction}</small></span>
              <span className="attention-time">{patient.status}</span><ArrowRight size={15} />
            </Link>)}
          {active.length === 0 && <EmptyState title="No cases pending" description="All visible cases are completed." />}</div>
        </Card>
      </div>
      <div className="dashboard-bottom-grid">
        <Card className="table-card"><div className="card-heading"><div><h2>Recent patient activity</h2><p>Current records from the demo backend</p></div><Link to="/patients" className="inline-link">All patients <ArrowRight size={14} /></Link></div>
          <PatientTable patients={list.slice(0, 5)} compact />
        </Card>
        <Card className="appointments-card"><div className="card-heading"><div><h2>Scheduled appointments</h2><p>Appointments from active care records</p></div><Link to="/appointments" className="icon-action"><ArrowRight size={16} /></Link></div>
          {appts.slice(0, 3).map(appointment => <AppointmentRow key={appointment.id} appointment={appointment} />)}
          {appts.length === 0 && <EmptyState title="No upcoming appointments" description="New appointments will appear here." />}
          <Link to="/appointments" className="appointments-footer">View appointments <ArrowRight size={14} /></Link>
        </Card>
      </div>
    </div>;
  }

  const title = `Good morning, ${(user?.name || "care team").split(" ")[0]}`;
  const description = role === "admin" ? "Here’s what’s happening across your care network today." : isDoctor ? "Your care team has a few important updates." : "Here are the patients and follow-ups that need your attention.";
  const metrics = role === "admin"
    ? [["Registered patients", "2,846", "+12.8%", Users, "vs. last month"], ["Screenings this month", "1,284", "+8.4%", ClipboardList, "vs. last month"], ["Open abnormal cases", "148", "12 urgent", Activity, "need attention"], ["Cases closed", "82.4%", "+4.2%", CheckCheck, "closure rate"]]
    : isDoctor
      ? [["Assigned patients", "42", "+4", Users, "this week"], ["New abnormal results", "8", "3 urgent", Activity, "need review"], ["Consultations today", "6", "2 remaining", CalendarDays, "next at 2:30 PM"], ["High-priority cases", "5", "2 overdue", Clock3, "need attention"]]
      : [["Assigned patients", "36", "+3", Users, "this week"], ["Need communication", "12", "4 urgent", Bell, "awaiting outreach"], ["Pending follow-ups", "8", "2 overdue", ClipboardCheck, "need attention"], ["Missed appointments", "3", "1 new", CalendarDays, "reschedule needed"]];
  const kpiTones = ["blue", "teal", "amber", "green"];
  return <div className="page-stack">
    <PageHeader eyebrow={`${roleLabels[role].toUpperCase()} WORKSPACE · MONDAY, NOVEMBER 17`} title={title} description={description} action={<button className="btn btn-secondary" onClick={() => window.print()}><Download size={15} /> Export report</button>} />
    <div className="demo-data-banner" role="note">Synthetic demo data · dashboard metrics are illustrative and are not calculated from a live database.</div>
    <div className="metric-grid">{metrics.map(([label, value, change, Icon, note], index) => <MetricCard key={String(label)} title={String(label)} value={String(value)} change={String(change)} icon={Icon as typeof Users} tone={kpiTones[index]} note={String(note)} />)}</div>
    <div className="dashboard-main-grid">
      <Card className="chart-card"><div className="card-heading"><div><h2>Screening to closure</h2><p>Monthly case progress across the care network</p></div><button className="select-button">Last 6 months <ChevronDown size={14} /></button></div><div className="chart-summary"><div><span>Total screenings</span><b>1,718</b></div><div><span>Cases closed</span><b>1,395</b></div><div className="chart-legend"><i className="legend-blue" /> Screened <i className="legend-teal" /> Closed</div></div><div className="line-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="screenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3c82ed" stopOpacity={0.14} /><stop offset="100%" stopColor="#3c82ed" stopOpacity={0} /></linearGradient><linearGradient id="closedFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#28ae9b" stopOpacity={0.13} /><stop offset="100%" stopColor="#28ae9b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e8edf2", fontSize: 12, boxShadow: "0 6px 20px #172b4d12" }} /><Area type="monotone" dataKey="screened" stroke="#4387ed" strokeWidth={2.5} fill="url(#screenFill)" /><Area type="monotone" dataKey="closed" stroke="#27ad9b" strokeWidth={2.5} fill="url(#closedFill)" /></AreaChart></ResponsiveContainer></div><div className="chart-bottom"><span><i className="legend-teal" /> <b>81.2%</b> of cases resolved within target</span><span>Updated just now</span></div></Card>
      <Card className="attention-card"><div className="card-heading"><div><h2>Needs attention</h2><p>Cases that could use a next step</p></div><Link to="/followups" className="inline-link">View all <ArrowRight size={14} /></Link></div><div className="attention-list">{list.filter((patient) => ["Overdue", "Awaiting patient", "In progress"].includes(patient.status)).slice(0, 4).map((patient) => <Link className="attention-item" key={patient.id} to={`/patient/${patient.id}`}><span className={`attention-indicator ${patient.status === "Overdue" ? "red" : patient.status === "Awaiting patient" ? "amber" : "blue"}`} /><Avatar initials={patient.initials} size="sm" /><span className="attention-copy"><b>{patient.name}</b><small>{patient.nextAction}</small></span><span className="attention-time">{patient.status === "Overdue" ? "2d overdue" : patient.status === "Awaiting patient" ? "Waiting" : "In progress"}</span><ChevronRight size={15} /></Link>)}</div><Link to="/followups" className="attention-footer">View follow-up queue <ArrowRight size={14} /></Link></Card>
    </div>
    <div className="dashboard-bottom-grid"><Card className="table-card"><div className="card-heading"><div><h2>{role === "admin" ? "Recent patient activity" : isDoctor ? "Your active cases" : "Patients to contact"}</h2><p>Stay up to date with the latest care journey updates</p></div><Link to="/patients" className="inline-link">All patients <ArrowRight size={14} /></Link></div><PatientTable patients={list.slice(0, 5)} compact /></Card>
      <Card className="appointments-card"><div className="card-heading"><div><h2>Upcoming appointments</h2><p>Next in your care schedule</p></div><Link to="/appointments" className="icon-action"><ArrowRight size={16} /></Link></div>{demoAppointments.slice(0, 3).map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)}<Link to="/appointments" className="appointments-footer">View calendar <ArrowRight size={14} /></Link></Card>
    </div>
    {role === "admin" && <div className="network-strip"><div><span className="network-icon blue"><Users size={18} /></span><span><b>38</b><small>Healthcare workers</small></span><span className="network-trend">+3 this month</span></div><div><span className="network-icon teal"><HeartPulse size={18} /></span><span><b>12</b><small>Care locations</small></span><span className="network-status"><i /> All systems active</span></div><div><span className="network-icon purple"><Activity size={18} /></span><span><b>91%</b><small>Follow-up within target</small></span><span className="network-trend">+5.1% this month</span></div></div>}
  </div>;
}

function PatientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [requested, setRequested] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpRequested, setHelpRequested] = useState(false);
  const query = useQuery({ queryKey: ["patient", "me", user?.id], queryFn: () => patientService.getMyProfile(user?.id || "") });
  const caseQuery = useQuery({ queryKey: ["patient-case", user?.patientId], queryFn: () => caseService.getMyCase(user?.patientId), enabled: Boolean(user) });
  const patientCase = caseQuery.data;
  const eventsQuery = useQuery({ queryKey: ["case-timeline", patientCase?.caseId], queryFn: () => caseService.getTimeline(patientCase!.caseId, patientCase!.patientId), enabled: Boolean(patientCase) });
  if (query.isLoading || caseQuery.isLoading) return <LoadingState />;
  if (query.error || caseQuery.error) return <ErrorState error={(query.error || caseQuery.error) instanceof Error ? (query.error || caseQuery.error as Error).message : "Please try again."} onRetry={() => { void query.refetch(); void caseQuery.refetch(); }} />;
  if (!query.data) return <EmptyState title="Your care profile is being set up" description="Your care team will connect your profile shortly." />;
  if (!patientCase) return <EmptyState title="No case is linked to your portal yet" description="Your care team will connect your screening case to this account." />;
  if (eventsQuery.error) return <ErrorState error={(eventsQuery.error as Error).message} onRetry={() => void eventsQuery.refetch()} />;
  const patient = query.data;
  const nextAppointment = patientCase.appointments.find((appointment) => appointment.status !== "Completed" && appointment.status !== "Missed" && appointment.status !== "Cancelled");
  return <div className="page-stack patient-portal">
    <PageHeader eyebrow="YOUR CARE JOURNEY" title={`Hello, ${user?.name.split(" ")[0]}`} description="Here’s an update on your screening and next steps." action={<Link className="btn btn-secondary" to="/my-case">View my case <ArrowRight size={15} /></Link>} />
    <div className="patient-welcome-card"><div className="welcome-icon"><HeartPulse size={23} /></div><div><Badge tone={statusTone(patientCase.status)}>{patientCase.status}</Badge><h2>Your care case is active</h2><p>{patientCase.nextAction}</p></div><div className="welcome-date"><CalendarDays size={16} /><span><small>NEXT APPOINTMENT</small><b>{nextAppointment ? `${nextAppointment.date} · ${nextAppointment.time}` : "Not scheduled"}</b></span></div></div>
    <div className="patient-portal-grid"><div className="portal-primary"><CaseTimeline compact events={eventsQuery.data || []} status={patientCase.status} loading={eventsQuery.isLoading} /><Card className="patient-screening-card"><div className="card-heading"><div><h2>Your screening result</h2><p>{patientCase.screening.date}</p></div><Badge tone={statusTone(patientCase.screening.status)}>{patientCase.screening.status}</Badge></div><div className="screening-result"><span className="result-symbol"><FileHeart size={20} /></span><div><b>{patientCase.screening.type}</b><small>{patientCase.screening.result}</small></div><span className="screening-date">{patientCase.priority} priority</span></div><div className="patient-info-note"><ShieldCheck size={15} /><span>{patientCase.screening.reviewState || "Review status not provided"} · {patientCase.priorityReason}</span></div><Link to="/my-case" className="inline-link">View screening details <ArrowRight size={14} /></Link></Card></div>
      <div className="portal-secondary"><Card className="doctor-card"><div className="card-heading"><div><h2>Your care team</h2><p>Here to help at every step</p></div><Stethoscope size={18} className="muted-icon" /></div><div className="doctor-profile"><Avatar initials={patientCase.assignedTo.split(" ").map((part) => part[0]).join("").slice(-2)} size="lg" tone="avatar-doctor" /><div><b>{patientCase.assignedTo}</b><small>Assigned clinician</small><span><i /> Your care team</span></div></div><div className="contact-row"><span>Care coordinator</span><b>{patientCase.careCoordinator}</b></div><button className="btn btn-secondary btn-full" onClick={() => setHelpOpen(true)}><CircleHelp size={15} /> Request help</button></Card>
      <Card className="patient-appointment-card"><div className="card-heading"><div><h2>Next appointment</h2><p>From your case record</p></div><CalendarDays size={17} className="muted-icon" /></div>{nextAppointment ? <div className="appointment-date-block"><div><small>{new Date(nextAppointment.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase()}</small><b>{new Date(nextAppointment.date).toLocaleDateString("en-US", { day: "numeric" })}</b></div><span><b>{nextAppointment.type}</b><small>{nextAppointment.clinician}</small><small>{nextAppointment.date} · {nextAppointment.time}</small></span></div> : <EmptyState title="No upcoming appointment" description="Your care team will update your case when a visit is scheduled." />}<button className="inline-link" onClick={() => setRequestOpen(true)}>Request an appointment <ArrowRight size={14} /></button></Card>
      <Card className="patient-notice"><span><Bell size={17} /></span><div><b>Case updates</b><p>Review and acknowledge care updates in your notification centre.</p><Link to="/notifications" className="inline-link">Open notifications <ArrowRight size={14} /></Link></div></Card></div></div>
    {requestOpen && <AppointmentRequestModal onClose={() => setRequestOpen(false)} onRequest={async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); await refreshPatientCase(queryClient); setRequested(true); setRequestOpen(false); }} patientName={patient.name} patientId={patient.id} />}
    {helpOpen && <HelpRequestModal caseId={patientCase.caseId} patientId={patientCase.patientId} onClose={() => setHelpOpen(false)} onCreated={async () => { await refreshPatientCase(queryClient); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); setHelpOpen(false); setHelpRequested(true); }} />}
    {requested && <Toast message="Appointment request sent to your care team." onClose={() => setRequested(false)} />}
    {helpRequested && <Toast message="Your help request was sent to your care team." onClose={() => setHelpRequested(false)} />}
    <p className="patient-privacy"><ShieldCheck size={13} /> Synthetic demonstration data only. Your portal displays information relevant to your care; internal clinical notes are not shown.</p>
  </div>;
}

function PatientCasePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const query = useQuery({ queryKey: ["patient-case", user?.patientId], queryFn: () => caseService.getMyCase(user?.patientId), enabled: Boolean(user) });
  const patientCase = query.data;
  const eventsQuery = useQuery({ queryKey: ["case-timeline", patientCase?.caseId], queryFn: () => caseService.getTimeline(patientCase!.caseId, patientCase!.patientId), enabled: Boolean(patientCase) });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} />;
  if (!patientCase) return <EmptyState title="No case is linked to your portal yet" description="Your care team will connect your screening case to this account." />;
  if (eventsQuery.error) return <ErrorState error={(eventsQuery.error as Error).message} onRetry={() => void eventsQuery.refetch()} />;
  return <div className="page-stack patient-case-page">
    <div className="back-link-row"><Link to="/dashboard/patient" className="back-link"><ChevronLeft size={15} /> My care</Link><span className="detail-id">CASE ID <b>{patientCase.caseId}</b></span></div>
    <PageHeader eyebrow="YOUR SCREENING CASE" title="Case details" description={`A clear view of your recorded screening, assigned care team, and next step.`} action={<button className="btn btn-secondary" onClick={() => setHelpOpen(true)}><CircleHelp size={15} /> Request help</button>} />
    <div className="patient-case-summary">
      <Card className="patient-case-next"><div className="card-heading"><div><h2>Current status</h2><p>Case {patientCase.patientReference}</p></div><Badge tone={statusTone(patientCase.status)}>{patientCase.status}</Badge></div><b>{patientCase.nextAction}</b><div className="case-meta-row"><span><UserRound size={14} /> Assigned to {patientCase.assignedTo}</span><span><Clock3 size={14} /> Due {formatDateTime(patientCase.dueAt)}</span></div></Card>
      <Card className="patient-case-screening"><div className="card-heading"><div><h2>Screening result</h2><p>Record {patientCase.screening.id} · {patientCase.screening.date}</p></div><Badge tone={statusTone(patientCase.screening.status)}>{patientCase.screening.status}</Badge></div><div className="patient-case-result"><b>{patientCase.screening.type}</b><p>{patientCase.screening.result}</p></div><div className="case-meta-row"><span>Priority: <b>{patientCase.priority}</b></span><span>Review: <b>{patientCase.screening.reviewState || "Not recorded"}</b></span></div><p className="priority-disclaimer">{patientCase.priorityReason} The displayed priority is a synthetic workflow indicator, not a medical assessment.</p></Card>
    </div>
    <div className="patient-case-records">
      <Card><div className="card-heading"><div><h2>Referral information</h2><p>Referrals linked to this case</p></div><FileHeart size={17} className="muted-icon" /></div>{patientCase.referrals.length ? patientCase.referrals.map((referral) => <div className="patient-record-row" key={referral.id}><span><b>{referral.specialty}</b><small>{referral.referredTo} · {referral.date}</small></span><Badge tone={statusTone(referral.status)}>{referral.status}</Badge></div>) : <EmptyState title="No referral recorded" description="A referral will appear here when your care team records one." />}</Card>
      <Card><div className="card-heading"><div><h2>Appointment information</h2><p>Visits linked to your case</p></div><CalendarDays size={17} className="muted-icon" /></div>{patientCase.appointments.length ? patientCase.appointments.map((appointment) => <div className="patient-record-row" key={appointment.id}><span><b>{appointment.type}</b><small>{appointment.date} · {appointment.time} · {appointment.clinician}</small></span><Badge tone={statusTone(appointment.status)}>{appointment.status}</Badge></div>) : <EmptyState title="No appointment recorded" description="Your care team will add visit details here." />}</Card>
      <Card><div className="card-heading"><div><h2>Follow-up information</h2><p>Tasks linked to your case</p></div><ClipboardCheck size={17} className="muted-icon" /></div>{patientCase.followups.length ? patientCase.followups.map((followup) => <div className="patient-record-row" key={followup.id}><span><b>{followup.reason}</b><small>{followup.due} · Owner: {followup.owner}</small></span><Badge tone={statusTone(followup.status)}>{followup.status}</Badge></div>) : <EmptyState title="No follow-up recorded" description="Your care team will add follow-up instructions here." />}</Card>
    </div>
    <CaseTimeline events={eventsQuery.data || []} status={patientCase.status} loading={eventsQuery.isLoading} />
    <p className="patient-privacy"><ShieldCheck size={13} /> Synthetic demonstration data only. This page shows case information relevant to your care; internal clinical notes are not shown.</p>
    {helpOpen && <HelpRequestModal caseId={patientCase.caseId} patientId={patientCase.patientId} onClose={() => setHelpOpen(false)} onCreated={async () => { await refreshPatientCase(queryClient); await queryClient.invalidateQueries({ queryKey: ["notifications"] }); setHelpOpen(false); setHelpSent(true); }} />}
    {helpSent && <Toast message="Your help request was sent to your care team." onClose={() => setHelpSent(false)} />}
  </div>;
}

function HelpRequestModal({ caseId, patientId, onClose, onCreated }: { caseId: string; patientId: string; onClose: () => void; onCreated: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: () => caseService.requestHelp(caseId, patientId, message),
    onSuccess: onCreated,
    onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not send your request."),
  });
  return <Modal title="Request help from your care team" description="Your message will be added to this case and delivered in the CARELOOP workspace." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(event) => { event.preventDefault(); setError(""); mutation.mutate(); }}>
      <Field label="How can your care team help?"><textarea rows={4} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a short message about what you need…" /></Field>
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending || message.trim().length < 8}>{mutation.isPending ? "Sending…" : "Send request"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value.includes("overdue") || value.includes("abnormal") || value.includes("missed")) return "rose";
  if (value.includes("awaiting") || value.includes("pending") || value.includes("due") || value.includes("needs")) return "amber";
  if (value.includes("closed") || value.includes("resolved") || value.includes("normal") || value.includes("completed") || value.includes("accepted")) return "green";
  if (value.includes("scheduled") || value.includes("referred") || value.includes("confirmed") || value.includes("progress")) return "blue";
  return "neutral";
}

function getPatientIdByName(name: string) {
  const ids: Record<string, string> = {
    "Olivia Rhye": "CL-2048",
    "Ethan Brooks": "CL-2047",
    "Amara Okafor": "CL-2046",
    "Noah Williams": "CL-2045",
    "Sofia Martinez": "CL-2044",
    "Liam Chen": "CL-2043",
    "Grace Kim": "CL-2042",
  };
  return ids[name] || "";
}

function PatientTable({ patients, compact = false }: { patients: Patient[]; compact?: boolean }) {
  const { user } = useAuth();
  const isPatient = user?.role === "patient";
  if (!patients.length) return <EmptyState title="No patients to show" description="Try adjusting your search or filters." />;
  return <div className={`table-scroll ${compact ? "compact-table" : ""}`}><table className="data-table"><thead><tr>
    <th>Patient</th>{!isPatient && <th>Screening</th>}<th>Case status</th>{!isPatient && !compact && <th>Care owner</th>}<th>{compact ? "Last activity" : "Next step"}</th>{!compact && <th aria-label="Actions" />}
  </tr></thead><tbody>{patients.map((patient) => <tr key={patient.id}>
    <td><Link to={`/patient/${patient.id}`} className="person-cell"><Avatar initials={patient.initials} size="sm" /><span><b>{patient.name}</b><small>{patient.id} · {patient.age} yrs</small></span></Link></td>
    {!isPatient && <td><span className="screening-cell"><b>{patient.screening}</b><small>{patient.result}</small></span></td>}
    <td><Badge tone={statusTone(patient.status)}><i className="badge-dot" />{patient.status}</Badge></td>
    {!isPatient && !compact && <td><span className="owner-cell">{patient.doctor}</span></td>}
    <td><span className="activity-cell">{compact ? patient.lastActivity : patient.nextAction}</span></td>
    {!compact && <td><Link className="row-action" to={`/patient/${patient.id}`} aria-label={`View ${patient.name}`}><ChevronRight size={17} /></Link></td>}
  </tr>)}</tbody></table></div>;
}

function PatientsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [createOpen, setCreateOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const canCreate = user?.role === "admin" || user?.role === "worker";
  const patients = (query.data || []).filter((patient) => {
    const matchesText = `${patient.name} ${patient.id} ${patient.screening}`.toLowerCase().includes(search.toLowerCase());
    return matchesText && (status === "All statuses" || patient.status === status);
  });
  return <div className="page-stack">
    <PageHeader eyebrow="CARE NETWORK" title="Patients" description="Manage patient profiles and keep every care journey moving." action={canCreate && <button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Add patient</button>} />
    <div className="list-overview"><div><b>{query.data?.length ?? "—"}</b><span>Total patients</span></div><div><b>{query.data?.filter((p) => p.status !== "Closed").length ?? "—"}</b><span>Active cases</span></div><div><b>{query.data?.filter((p) => p.priority === "High").length ?? "—"}</b><span>High priority</span></div><div><b>{query.data?.filter((p) => p.status === "Overdue").length ?? "—"}</b><span>Overdue follow-ups</span></div></div>
    <Card className="table-card list-page-card"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search patients…" value={search} onChange={(e) => setSearch(e.target.value)} /><kbd>⌘ K</kbd></div><label className="filter-select"><Filter size={15} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option>All statuses</option>{["In progress", "In care", "Awaiting patient", "Appointment scheduled", "Referred", "Overdue", "Resolved", "Closed"].map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><button className="btn btn-secondary btn-sm filter-extra" onClick={() => setStatus("All statuses")}><SlidersHorizontal size={14} /> Reset filters</button></div>
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} /> : <PatientTable patients={patients} />}
      <div className="table-pagination"><span>Showing <b>{patients.length ? 1 : 0}–{patients.length}</b> of <b>{patients.length}</b> patients</span><div><button disabled><ChevronLeft size={15} /></button><button className="page-number active">1</button><button disabled><ChevronRight size={15} /></button></div></div>
    </Card>
    {createOpen && <CreatePatientModal onClose={() => setCreateOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["patients"] }); setCreated(true); setCreateOpen(false); }} />}
    {created && <Toast message="Patient profile created successfully." onClose={() => setCreated(false)} />}
  </div>;
}

const createPatientSchema = z.object({
  name: z.string().min(2, "Enter the patient’s name."),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.string().min(1, "Select a value."),
  phone: z.string().min(7, "Enter a valid phone number."),
  email: z.string().email("Enter a valid email address."),
});
type CreatePatientValues = z.infer<typeof createPatientSchema>;
function CreatePatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const form = useForm<z.input<typeof createPatientSchema>, unknown, CreatePatientValues>({ resolver: zodResolver(createPatientSchema), defaultValues: { name: "", age: 30, gender: "", phone: "", email: "" } });
  const mutation = useMutation({ mutationFn: patientService.create, onSuccess: onCreated });
  return <Modal title="Add a patient" description="Create a secure profile to begin coordinating care." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Field label="Full name" error={form.formState.errors.name?.message}><input {...form.register("name")} placeholder="Patient name" /></Field>
      <div className="form-row"><Field label="Age" error={form.formState.errors.age?.message}><input type="number" {...form.register("age")} /></Field><Field label="Gender" error={form.formState.errors.gender?.message}><select {...form.register("gender")}><option value="">Select</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></Field></div>
      <Field label="Phone number" error={form.formState.errors.phone?.message}><input {...form.register("phone")} placeholder="+1 (555) 000-0000" /></Field>
      <Field label="Email address" error={form.formState.errors.email?.message}><input {...form.register("email")} type="email" placeholder="patient@email.com" /></Field>
      {mutation.error && <div className="form-error">{(mutation.error as Error).message}</div>}
      <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Creating…" : "Create patient"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function CareTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(teamMembers);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const filtered = members.filter((member) => `${member.name} ${member.role} ${member.specialty}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="page-stack">
    <PageHeader eyebrow="NETWORK ADMINISTRATION" title="Care team" description="Manage physicians and care coordinators across your network." action={<button className="btn btn-primary" onClick={() => setInviteOpen(true)}><Plus size={16} /> Add team member</button>} />
    <div className="list-overview"><div><b>{members.filter((member) => member.role === "Physician").length}</b><span>Physicians</span></div><div><b>{members.filter((member) => member.role === "Care coordinator").length}</b><span>Care coordinators</span></div><div><b>{members.filter((member) => member.status === "Active").length}</b><span>Active members</span></div><div><b>12</b><span>Care locations</span></div></div>
    <Card className="table-card list-page-card"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search care team…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button className="btn btn-secondary btn-sm" onClick={() => setQuery("")}><SlidersHorizontal size={14} /> Clear</button></div>
      <div className="table-scroll"><table className="data-table team-table"><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>SPECIALTY</th><th>CARE LOCATION</th><th>ASSIGNED PATIENTS</th><th>STATUS</th><th /></tr></thead><tbody>{filtered.map((member) => <tr key={member.id}><td><span className="person-cell"><Avatar initials={member.initials} size="sm" /><span><b>{member.name}</b><small>{member.id}</small></span></span></td><td>{member.role}</td><td>{member.specialty}</td><td>{member.location}</td><td>{member.patients}</td><td><Badge tone={member.status === "Active" ? "green" : "neutral"}><i className="badge-dot" />{member.status}</Badge></td><td><button className="row-action" aria-label={`Toggle availability for ${member.name}`} title="Toggle availability" onClick={() => { setMembers((current) => current.map((item) => item.id === member.id ? { ...item, status: item.status === "Active" ? "On leave" : "Active" } : item)); setNotice(`${member.name} availability updated.`); }}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>
      {!filtered.length && <EmptyState title="No team members found" description="Try another search." />}
      <div className="table-pagination"><span>Showing <b>{filtered.length}</b> of <b>{members.length}</b> members</span><div><button disabled><ChevronLeft size={15} /></button><button className="page-number active">1</button><button disabled><ChevronRight size={15} /></button></div></div>
    </Card>
    <div className="referral-note"><span className="section-icon teal"><HeartPulse size={17} /></span><div><b>Care ownership keeps patients connected</b><p>Assign a clinician and care coordinator to every abnormal result, with a clear owner for each next step.</p></div><Link className="inline-link" to="/patients">View patients <ArrowRight size={14} /></Link></div>
    {inviteOpen && <InviteMemberModal onClose={() => setInviteOpen(false)} onCreate={(member) => { teamMembers.unshift(member); setMembers((current) => [member, ...current]); setInviteOpen(false); setNotice(`${member.name} added to the care team.`); }} />}
    {notice && <Toast message={notice} onClose={() => setNotice("")} />}
  </div>;
}

function InviteMemberModal({ onClose, onCreate }: { onClose: () => void; onCreate: (member: TeamMember) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Care coordinator");
  const [specialty, setSpecialty] = useState("");
  const [location, setLocation] = useState("Bayview Medical");
  const [error, setError] = useState("");
  return <Modal title="Add team member" description="Add a physician or care coordinator to this care network." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(event) => { event.preventDefault(); if (name.trim().length < 2 || specialty.trim().length < 2) { setError("Enter a name and care specialty."); return; } onCreate({ id: `TW-${Date.now().toString().slice(-3)}`, name: name.trim(), initials: name.trim().split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role, specialty: specialty.trim(), location, patients: 0, status: "Active" }); }}>
      <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Team member name" /></Field>
      <div className="form-row"><Field label="Role"><select value={role} onChange={(event) => setRole(event.target.value)}><option>Care coordinator</option><option>Physician</option></select></Field><Field label="Care location"><select value={location} onChange={(event) => setLocation(event.target.value)}><option>Bayview Medical</option><option>Northside Clinic</option><option>East Bay Center</option></select></Field></div>
      <Field label="Specialty / focus"><input value={specialty} onChange={(event) => setSpecialty(event.target.value)} placeholder="e.g. Patient outreach" /></Field>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary">Add member <Plus size={15} /></button></div>
    </form>
  </Modal>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const eventLabels: Record<string, string> = {
  screening_recorded: "Screening recorded",
  case_created: "Case created",
  case_assigned: "Case assigned",
  notification_sent: "In-app notification sent",
  patient_acknowledged: "Patient acknowledged notification",
  referral_created: "Referral created",
  referral_updated: "Referral updated",
  appointment_recorded: "Appointment recorded",
  appointment_requested: "Appointment requested",
  appointment_updated: "Appointment updated",
  followup_recorded: "Follow-up task recorded",
  followup_completed: "Follow-up completed",
  followup_activity: "Follow-up activity",
  clinical_review: "Clinical review recorded",
  case_status_updated: "Case status updated",
  case_escalated: "Case escalated",
  help_requested: "Patient requested help",
  case_verified_closed: "Case closure verified",
};

function CaseTimeline({ compact = false, events, status, loading = false }: { compact?: boolean; events: CaseTimelineEvent[]; status: string; loading?: boolean }) {
  const orderedEvents = events.slice().sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  return <Card className={`journey-card ${compact ? "journey-compact" : ""}`}>
    <div className="card-heading"><div><div className="journey-title-row"><span className="section-icon teal"><Activity size={17} /></span><h2>Recorded case history</h2></div><p>Chronological events recorded for this case</p></div><Badge tone={statusTone(status)}>{status}</Badge></div>
    {loading ? <LoadingState /> : orderedEvents.length ? <div className="timeline">{orderedEvents.map((event) => <div className="timeline-item complete event-timeline-item" key={event.id}>
      <div className="timeline-marker"><Check size={12} /></div><div className="timeline-content">
        <div className="timeline-title"><b>{eventLabels[event.eventType] || event.eventType.replaceAll("_", " ")}</b></div>
        <p>{event.description}</p>
        <div className="timeline-meta"><span><Clock3 size={12} />{formatDateTime(event.createdAt)}</span><span><UserRound size={12} />{event.actorName} · {event.actorRole}</span></div>
      </div>
    </div>)}</div> : <EmptyState title="No case events recorded" description="Recorded care activity will appear here as the case progresses." />}
    {!compact && <div className="closure-note"><ShieldCheck size={15} /><span>Only events recorded in the case history are shown. Case closure requires authorized verification.</span></div>}
  </Card>;
}

function PatientDetailsPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["patient", id, user?.role], queryFn: () => patientService.get(id, user?.role, user?.patientId) });
  const timelineQuery = useQuery({
    queryKey: ["case-timeline", query.data?.caseId],
    queryFn: () => caseService.getTimeline(query.data!.caseId!, query.data!.id),
    enabled: Boolean(query.data?.caseId),
  });
  const [closureOpen, setClosureOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [toast, setToast] = useState("");
  const contactMutation = useMutation({
    mutationFn: () => patientService.recordCommunication(id, "Phone call", "Contact attempt logged by care team."),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["patient", id] }); await queryClient.invalidateQueries({ queryKey: ["patients"] }); await refreshPatientCase(queryClient); setToast("Phone communication attempt recorded in the patient history."); },
    onError: (issue) => setToast(issue instanceof Error ? issue.message : "Could not record the communication attempt."),
  });
  if (query.isLoading) return <LoadingState />;
  if (query.error) return <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} />;
  const patient = query.data;
  if (!patient) return <EmptyState title="Patient not found" description="This patient record may have been removed or is unavailable." />;
  if (user?.role === "patient" && patient.id !== user.patientId) return <Navigate to="/dashboard/patient" replace />;
  return <div className="page-stack">
    <div className="back-link-row"><Link to={user?.role === "patient" ? "/dashboard/patient" : "/patients"} className="back-link"><ChevronLeft size={15} /> {user?.role === "patient" ? "My care" : "All patients"}</Link><span className="detail-id">PATIENT ID <b>{patient.id}</b></span></div>
    <div className="patient-profile-header"><div className="patient-main-identity"><Avatar initials={patient.initials} size="lg" /><div><div className="identity-name-row"><h1>{patient.name}</h1><Badge tone={statusTone(patient.status)}><i className="badge-dot" />{patient.status}</Badge></div><p>{patient.age} years · {patient.gender} · {patient.location}</p><div className="identity-contact"><span>{patient.phone}</span><i /> <span>{patient.email}</span></div></div></div><div className="patient-actions">{user?.role !== "patient" && <><button className="btn btn-secondary btn-sm" disabled={contactMutation.isPending} onClick={() => contactMutation.mutate()}><Bell size={14} /> {contactMutation.isPending ? "Recording…" : "Log contact"}</button><button className="btn btn-primary btn-sm" onClick={() => navigate("/appointments")}><CalendarDays size={14} /> Schedule follow-up</button></>}</div></div>
    <div className="patient-detail-layout"><div className="patient-detail-primary">
      {patient.caseId ? timelineQuery.error ? <ErrorState error={(timelineQuery.error as Error).message} onRetry={() => void timelineQuery.refetch()} /> : <CaseTimeline events={timelineQuery.data || []} status={patient.status} loading={timelineQuery.isLoading} /> : <Card><EmptyState title="No linked case history" description="No case events have been recorded for this patient." /></Card>}
      <Card className="patient-activity-card"><div className="card-heading"><div><h2>Latest screening record</h2><p>Screening result connected to this care journey</p></div><Link to="/screenings" className="inline-link">All records <ArrowRight size={14} /></Link></div><div className="detail-screening-row"><span className="screen-icon"><FileHeart size={20} /></span><div><b>{patient.screening}</b><small>{patient.result}</small></div><Badge tone="rose">Abnormal</Badge><Link to="/screenings" className="row-action"><ArrowRight size={16} /></Link></div><div className="screening-detail-meta"><span>RECEIVED<b>Nov 15, 2026 · 9:12 AM</b></span><span>REVIEWED BY<b>{patient.doctor}</b></span><span>RECOMMENDATION<b>Diagnostic follow-up required</b></span></div></Card>
      {user?.role !== "patient" && <Card className="clinical-note-card"><div className="card-heading"><div><h2>Care team notes</h2><p>Internal notes · only visible to authorized care staff</p></div><button className="btn btn-secondary btn-sm" onClick={() => setNoteOpen(true)}><Plus size={14} /> Add note</button></div>{patient.clinicalNotes?.length ? patient.clinicalNotes.map((note) => <div className="note-entry" key={note.id}><Avatar initials={note.author.split(" ").map((part) => part[0]).join("").slice(-2)} size="sm" /><div><div><b>{note.author}</b><small>{note.createdAt}</small></div><p>{note.text}</p></div></div>) : <EmptyState title="No clinical notes yet" description="Add a note to document care-team review." />}</Card>}
      {user?.role !== "patient" && <Card className="clinical-note-card"><div className="card-heading"><div><h2>Communication history</h2><p>Outreach attempts recorded for this patient</p></div><button className="btn btn-secondary btn-sm" disabled={contactMutation.isPending} onClick={() => contactMutation.mutate()}><Plus size={14} /> Log attempt</button></div>{patient.communicationLog?.length ? patient.communicationLog.map((entry) => <div className="communication-entry" key={entry.id}><span className="communication-icon"><Bell size={14} /></span><span><b>{entry.channel}</b><small>{entry.outcome}</small></span><time>{entry.createdAt}</time></div>) : <EmptyState title="No communication attempts yet" description="Record a phone call, message, or patient response." />}</Card>}
      {(patient.status === "Resolved" || patient.status === "In care") && user?.role !== "patient" && <Card className="close-case-card"><span className="section-icon green"><CheckCheck size={17} /></span><div><b>Verify care completion</b><p>Close only after clinical documentation confirms the required follow-up is complete.</p></div><button className="btn btn-primary btn-sm" onClick={() => setClosureOpen(true)}>Review closure <ArrowRight size={14} /></button></Card>}
    </div><aside className="patient-detail-aside">
      <Card className="detail-side-card"><div className="card-heading"><div><h2>Care team</h2><p>Assigned to this patient</p></div><Users size={17} className="muted-icon" /></div><div className="team-person"><Avatar initials={patient.doctor.split(" ").map((p) => p[0]).join("").slice(-2)} size="sm" tone="avatar-doctor" /><span><b>{patient.doctor}</b><small>Primary care physician</small></span></div><div className="team-person"><Avatar initials={patient.coordinator.split(" ").map((p) => p[0]).join("").slice(-2)} size="sm" /><span><b>{patient.coordinator}</b><small>Care coordinator</small></span></div>{user?.role !== "patient" && <button className="btn btn-secondary btn-full btn-sm" onClick={() => setTeamOpen(true)}>Manage care team</button>}</Card>
      <Card className="detail-side-card next-action-card"><div className="card-heading"><div><h2>Next action</h2><p>Keep this care journey moving</p></div><span className="section-icon amber"><Clock3 size={16} /></span></div><div className="next-action-callout"><small>{patient.status === "Overdue" ? "PAST DUE" : "UP NEXT"}</small><b>{patient.nextAction}</b><span><CalendarDays size={13} /> {patient.appointment || "Due today"}</span></div>{user?.role !== "patient" && <button className="btn btn-primary btn-full btn-sm" onClick={() => setProgressOpen(true)}>Update next step <ArrowRight size={14} /></button>}</Card>
      <Card className="detail-side-card"><div className="card-heading"><div><h2>Case details</h2><p>Screening & priority</p></div><MoreHorizontal size={17} className="muted-icon" /></div><div className="detail-kv"><span>Priority</span><Badge tone={patient.priority === "High" ? "rose" : patient.priority === "Medium" ? "amber" : "green"}>{patient.priority}</Badge></div><div className="detail-kv"><span>Screening type</span><b>{patient.screening}</b></div><div className="detail-kv"><span>Patient since</span><b>Nov 02, 2026</b></div><div className="detail-kv"><span>Last activity</span><b>{patient.lastActivity}</b></div></Card>
    </aside></div>
    {closureOpen && <ClosureModal patient={patient} onClose={() => setClosureOpen(false)} onConfirm={async (note) => { await patientService.closeCase(patient.id, patient.caseId || "", note, user?.name || "Care team"); await queryClient.invalidateQueries({ queryKey: ["patient", patient.id] }); await queryClient.invalidateQueries({ queryKey: ["patients"] }); await refreshPatientCase(queryClient); setClosureOpen(false); setToast("Case closure verified and recorded."); }} />}
    {noteOpen && <ClinicalNoteModal patient={patient} author={user?.name || "Care team"} onClose={() => setNoteOpen(false)} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["patient", patient.id] }); await refreshPatientCase(queryClient); setNoteOpen(false); setToast("Clinical note added to the internal care record."); }} />}
    {progressOpen && <ProgressUpdateModal patient={patient} onClose={() => setProgressOpen(false)} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["patient", patient.id] }); await queryClient.invalidateQueries({ queryKey: ["patients"] }); await refreshPatientCase(queryClient); setProgressOpen(false); setToast("Care journey updated with the new next step."); }} />}
    {teamOpen && <AssignCareTeamModal patient={patient} onClose={() => setTeamOpen(false)} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["patient", patient.id] }); await queryClient.invalidateQueries({ queryKey: ["patients"] }); await refreshPatientCase(queryClient); setTeamOpen(false); setToast("Care team assignment updated."); }} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div>;
}

function ClinicalNoteModal({ patient, author, onClose, onSaved }: { patient: Patient; author: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => patientService.addClinicalNote(patient.id, note.trim(), author), onSuccess: onSaved, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not save this note.") });
  return <Modal title="Add clinical note" description={`This note is internal to the care team and will not appear in the patient portal.`} onClose={onClose}>
    <div className="form-stack modal-form"><div className="patient-note-context"><Avatar initials={patient.initials} size="sm" /><span><b>{patient.name}</b><small>{patient.id} · Internal care record</small></span></div><label className="form-field"><span>Clinical note</span><textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Document clinical review, recommendations, or treatment progress…" /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={note.trim().length < 8 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : "Save internal note"} <Check size={15} /></button></div></div>
  </Modal>;
}

function AssignCareTeamModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: () => Promise<void> }) {
  const physicians = teamMembers.filter((member) => member.role === "Physician");
  const coordinators = teamMembers.filter((member) => member.role === "Care coordinator");
  const [doctor, setDoctor] = useState(patient.doctor);
  const [coordinator, setCoordinator] = useState(patient.coordinator);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => patientService.assignCareTeam(patient.id, doctor, coordinator), onSuccess: onSaved, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not update the care team.") });
  return <Modal title="Manage care team" description={`Set accountable owners for ${patient.name}’s care journey.`} onClose={onClose}>
    <div className="form-stack modal-form"><Field label="Assigned physician"><select value={doctor} onChange={(event) => setDoctor(event.target.value)}>{physicians.map((member) => <option key={member.id}>{member.name}</option>)}</select></Field><Field label="Care coordinator"><select value={coordinator} onChange={(event) => setCoordinator(event.target.value)}>{coordinators.map((member) => <option key={member.id}>{member.name}</option>)}</select></Field><div className="request-info"><Users size={15} /><span>Assigned clinicians are responsible for reviewing results and coordinating the patient’s next step.</span></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Update care team"} <Check size={15} /></button></div></div>
  </Modal>;
}

function ProgressUpdateModal({ patient, onClose, onSaved }: { patient: Patient; onClose: () => void; onSaved: () => Promise<void> }) {
  const [nextAction, setNextAction] = useState(patient.nextAction);
  const [status, setStatus] = useState<Exclude<CaseStatus, "Closed">>(patient.status === "Closed" ? "Resolved" : patient.status);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => patientService.updateProgress(patient.id, nextAction.trim(), status), onSuccess: onSaved, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not update the care journey.") });
  return <Modal title="Update care journey" description="Record the current case status and the owner’s next action. Case closure requires a separate documented confirmation." onClose={onClose}>
    <div className="form-stack modal-form"><div className="patient-note-context"><Avatar initials={patient.initials} size="sm" /><span><b>{patient.name}</b><small>{patient.id} · {patient.doctor}</small></span></div><Field label="Case status"><select value={status} onChange={(event) => setStatus(event.target.value as Exclude<CaseStatus, "Closed">)}>{["In progress", "In care", "Awaiting patient", "Appointment scheduled", "Referred", "Overdue", "Resolved"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Next action"><input value={nextAction} onChange={(event) => setNextAction(event.target.value)} /></Field>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={nextAction.trim().length < 3 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : "Save update"} <Check size={15} /></button></div></div>
  </Modal>;
}

function ClosureModal({ patient, onClose, onConfirm }: { patient: Patient; onClose: () => void; onConfirm: (note: string) => Promise<void> }) {
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => onConfirm(note), onError: (issue) => setError(issue instanceof Error ? issue.message : "The case could not be closed.") });
  return <Modal title="Confirm case closure" description={`Review the documented care for ${patient.name} before requesting closure.`} onClose={onClose}>
    <div className="closure-summary"><span className="closure-check"><CheckCheck size={18} /></span><div><b>Care completion is documented</b><p>Screening follow-up, patient communication, and treatment status are ready for review.</p></div></div>
    <label className="form-field"><span>Closure confirmation note</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Document how follow-up or treatment was completed…" /></label>
    <label className="checkbox-row"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>I confirm the required follow-up or treatment has been completed and documented.</span></label>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!confirmed || note.trim().length < 8 || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Closing…" : "Confirm closure"} <Check size={15} /></button></div>
  </Modal>;
}

function ScreeningsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["screenings", user?.role], queryFn: () => screeningService.list(user?.role) });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All results");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const canUpload = user?.role === "admin" || user?.role === "worker" || user?.role === "doctor";
  const rows = (query.data || []).filter((item) => `${item.patient} ${item.id} ${item.type}`.toLowerCase().includes(search.toLowerCase()) && (filter === "All results" || item.status === filter));
  return <div className="page-stack">
    <PageHeader eyebrow="SCREENING WORKSPACE" title="Screening records" description="Review results, identify abnormalities, and connect findings to follow-up." action={canUpload && <button className="btn btn-primary" onClick={() => setUploadOpen(true)}><FilePlus2 size={16} /> Add screening</button>} />
    <div className="screening-stat-row"><div><span className="stat-dot rose" /><b>24</b><small>Abnormal results · need follow-up</small></div><div><span className="stat-dot amber" /><b>8</b><small>Pending clinical review</small></div><div><span className="stat-dot green" /><b>306</b><small>Reviewed this month</small></div></div>
    <Card className="table-card list-page-card"><div className="list-toolbar"><div className="search-field"><Search size={16} /><input placeholder="Search patient or screening type…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><label className="filter-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All results</option><option>Abnormal</option><option>Normal</option><option>Pending review</option></select><ChevronDown size={14} /></label><button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setFilter("All results"); }}><SlidersHorizontal size={14} /> Reset</button></div>
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} /> : <div className="table-scroll"><table className="data-table screening-table"><thead><tr><th>SCREENING ID</th><th>PATIENT</th><th>SCREENING TYPE</th><th>RESULT</th><th>DATE RECEIVED</th><th>REVIEWED BY</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link to={`/screening/${row.id}`} className="mono-link">{row.id}</Link></td><td><Link to={`/patient/${row.patientId || getPatientIdByName(row.patient)}`} className="person-cell"><Avatar initials={row.initials} size="sm" /><span><b>{row.patient}</b><small>Screening record</small></span></Link></td><td>{row.type}</td><td><div className="result-cell"><Badge tone={statusTone(row.status)}><i className="badge-dot" />{row.status}</Badge><small>{row.result}</small></div></td><td>{row.date}</td><td>{row.clinician}</td><td><Link className="row-action" to={`/screening/${row.id}`}><ChevronRight size={16} /></Link></td></tr>)}</tbody></table></div>}
      <div className="table-pagination"><span>Showing <b>{rows.length}</b> of <b>{query.data?.length || 0}</b> records</span><div><button disabled><ChevronLeft size={15} /></button><button className="page-number active">1</button><button disabled><ChevronRight size={15} /></button></div></div>
    </Card>
    {uploadOpen && <CreateScreeningModal onClose={() => setUploadOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["screenings"] }); await refreshPatientCase(queryClient); setUploadOpen(false); setNotice("Screening record saved and queued for review."); }} />}
    {notice && <Toast message={notice} onClose={() => setNotice("")} />}
  </div>;
}

function CreateScreeningModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { user } = useAuth();
  const patientQuery = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const [patient, setPatient] = useState("");
  const [type, setType] = useState("");
  const [result, setResult] = useState("");
  const [report, setReport] = useState<File>();
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: screeningService.create, onSuccess: onCreated, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not save screening record.") });
  return <Modal title="Add screening record" description="Enter the screening result and connect it to the patient’s care journey." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(event) => { event.preventDefault(); if (!patient || !type || result.trim().length < 3) { setError("Select a patient and screening type, then enter the result summary."); return; } if (report && report.size > 10 * 1024 * 1024) { setError("The report must be smaller than 10 MB."); return; } setError(""); mutation.mutate({ patient: patient.split(" · ")[0], patientId: patient.split(" · ")[1], type, result: result.trim(), report }); }}>
      <Field label="Patient"><select value={patient} onChange={(event) => setPatient(event.target.value)}><option value="">Select a patient</option>{(patientQuery.data || []).map((p) => <option key={p.id} value={`${p.name} · ${p.id}`}>{p.name} · {p.id}</option>)}</select></Field>
      <Field label="Screening type"><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Select screening type</option><option>Mammogram</option><option>Colorectal FIT</option><option>Cervical screening</option><option>Lung CT</option><option>Cardiovascular / blood pressure</option></select></Field>
      <Field label="Result summary"><input value={result} onChange={(event) => setResult(event.target.value)} placeholder="e.g. BI-RADS 4 · Suspicious finding" /></Field>
      <label className="upload-zone"><FilePlus2 size={21} /><b>{report?.name || "Attach screening report"}</b><small>PDF or image · up to 10 MB</small><input type="file" accept=".pdf,image/*" onChange={(event) => setReport(event.target.files?.[0])} /></label>
      {report && report.size > 10 * 1024 * 1024 && <div className="form-error">The report must be smaller than 10 MB.</div>}
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending || (report ? report.size > 10 * 1024 * 1024 : false)}>{mutation.isPending ? "Saving…" : "Save record"} <Check size={15} /></button></div>
    </form>
  </Modal>;
}

function ScreeningDetailsPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["screenings", user?.role], queryFn: () => screeningService.list(user?.role) });
  const [toast, setToast] = useState("");
  const [followupOpen, setFollowupOpen] = useState(false);
  if (query.isLoading) return <LoadingState />;
  const item = query.data?.find((screening) => screening.id === id);
  if (!item) return <EmptyState title="Screening record not found" description="This record may have been removed or is unavailable." />;
  const patientId = item.patientId || getPatientIdByName(item.patient);
  return <div className="page-stack"><div className="back-link-row"><Link to="/screenings" className="back-link"><ChevronLeft size={15} /> Screening records</Link><span className="detail-id">RECORD ID <b>{item.id}</b></span></div><PageHeader eyebrow="SCREENING RESULT" title={item.type} description={`Received ${item.date} · ${item.patient}`} action={<button className="btn btn-secondary" onClick={() => window.print()}><Download size={15} /> Print report</button>} />
    <div className="screening-detail-grid"><div><Card className="result-report-card"><div className="result-report-head"><span className="screen-icon"><FileHeart size={20} /></span><span><Badge tone={statusTone(item.status)}>{item.status}</Badge><h2>{item.result}</h2><p>Screening finding requires care team review and follow-up.</p></span></div><div className="report-data-grid"><div><small>SCREENING TYPE</small><b>{item.type}</b></div><div><small>DATE COMPLETED</small><b>{item.date}</b></div><div><small>REVIEWING CLINICIAN</small><b>{item.clinician}</b></div><div><small>FOLLOW-UP STATUS</small><b><Badge tone="amber">Follow-up recommended</Badge></b></div></div><div className="report-recommendation"><span><Sparkles size={16} /></span><div><b>Recommended next step</b><p>Contact the patient, review findings with the assigned clinician, and coordinate diagnostic follow-up.</p></div></div><button className="btn btn-primary" onClick={() => setFollowupOpen(true)}><Plus size={15} /> Create follow-up</button></Card><Card className="report-document"><div className="card-heading"><div><h2>Attached report</h2><p>Screening documentation</p></div></div><div className="document-preview"><span><FileHeart size={25} /></span><b>{item.type.replaceAll(" ", "_").toLowerCase()}_report.pdf</b><small>PDF · 1.8 MB · uploaded Nov 15, 2026</small><button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Download size={14} /> Print report</button></div></Card></div><div className="screening-detail-aside"><Card className="detail-side-card"><div className="card-heading"><div><h2>Patient</h2><p>Linked care journey</p></div><Users size={17} className="muted-icon" /></div><Link to={`/patient/${patientId}`} className="patient-side-link"><Avatar initials={item.initials} size="md" /><span><b>{item.patient}</b><small>{patientId}</small></span><ChevronRight size={16} /></Link><div className="detail-kv"><span>Case status</span><Badge tone={statusTone(item.status === "Abnormal" ? "In progress" : item.status)}>{item.status === "Abnormal" ? "In progress" : item.status}</Badge></div><div className="detail-kv"><span>Care owner</span><b>{item.clinician}</b></div><Link className="btn btn-secondary btn-full btn-sm" to={`/patient/${patientId}`}>View care journey <ArrowRight size={14} /></Link></Card><div className="clinical-alert"><ShieldCheck size={16} /><div><b>Continuity matters</b><p>This finding remains open until the recommended follow-up is completed and documented.</p></div></div></div></div>
    {followupOpen && <CreateFollowUpModal onClose={() => setFollowupOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["followups"] }); await refreshPatientCase(queryClient); setFollowupOpen(false); setToast("Follow-up added to the care coordination queue."); }} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div>;
}

function FollowUpsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["followups", user?.role], queryFn: () => followupService.list(user?.role) });
  const [filter, setFilter] = useState("All follow-ups");
  const [completing, setCompleting] = useState("");
  const [escalating, setEscalating] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const completeMutation = useMutation({
    mutationFn: followupService.complete,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["followups"] }); await refreshPatientCase(queryClient); setCompleting(""); setToast("Follow-up completion recorded. The care case remains open until all closure criteria are met."); },
    onError: (issue) => { setCompleting(""); setToast(issue instanceof Error ? issue.message : "Could not complete the follow-up."); },
  });
  const escalationMutation = useMutation({
    mutationFn: followupService.escalate,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["followups"] }); await refreshPatientCase(queryClient); setEscalating(""); setToast("Overdue follow-up escalated to the care team lead."); },
    onError: (issue) => { setEscalating(""); setToast(issue instanceof Error ? issue.message : "Could not escalate follow-up."); },
  });
  const items = (query.data || []).filter((item) => filter === "All follow-ups" || item.status === filter);
  const patientId = (item: FollowUp) => item.patientId || getPatientIdByName(item.patient);
  return <div className="page-stack"><PageHeader eyebrow="CARE COORDINATION" title="Follow-ups" description="Keep every patient touchpoint on track with clear ownership and due dates." action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Create follow-up</button>} />
    <div className="list-overview followup-overview"><div><b>{(query.data || []).filter((i) => i.status === "Overdue").length}</b><span>Overdue</span></div><div><b>{(query.data || []).filter((i) => i.status === "Due today").length}</b><span>Due today</span></div><div><b>{(query.data || []).filter((i) => i.status === "Upcoming").length}</b><span>Upcoming</span></div><div><b>{(query.data || []).filter((i) => i.status === "Completed").length}</b><span>Completed</span></div></div>
    <Card className="table-card list-page-card"><div className="list-toolbar"><div className="toolbar-heading"><h2>Follow-up queue</h2><p>Prioritized by due date and care urgency</p></div><label className="filter-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All follow-ups</option><option>Overdue</option><option>Due today</option><option>Upcoming</option></select><ChevronDown size={14} /></label></div>
      {query.isLoading ? <LoadingState /> : !items.length ? <EmptyState title="No follow-ups in this view" description="All caught up. New follow-ups will appear here." /> : <div className="followup-list">{items.map((item) => <div className={`followup-item ${item.status === "Overdue" ? "is-overdue" : ""}`} key={item.id}><span className={`followup-status-icon ${statusTone(item.status)}`}>{item.status === "Completed" ? <Check size={15} /> : <Clock3 size={15} />}</span><Link to={`/patient/${patientId(item)}`} className="person-cell"><Avatar initials={item.initials} size="sm" /><span><b>{item.patient}</b><small>{item.id} · {item.reason}</small></span></Link><span className="followup-owner"><small>OWNER</small><b>{item.owner}</b></span><span className="followup-due"><small>DUE</small><b className={item.status === "Overdue" ? "text-rose" : ""}>{item.due}</b></span>{item.escalated && <Badge tone="rose">Escalated</Badge>}<Badge tone={statusTone(item.status)}>{item.status}</Badge>{item.status === "Overdue" && !item.escalated && <button className="btn btn-sm btn-secondary" disabled={escalationMutation.isPending && escalating === item.id} onClick={() => { setEscalating(item.id); escalationMutation.mutate(item.id); }}>{escalating === item.id ? "Escalating…" : "Escalate"}</button>}<button className={`btn btn-sm ${item.status === "Completed" ? "btn-success" : "btn-secondary"}`} disabled={item.status === "Completed" || (completeMutation.isPending && completing === item.id)} onClick={() => { setCompleting(item.id); completeMutation.mutate(item.id); }}>{item.status === "Completed" ? <><Check size={14} /> Done</> : completing === item.id ? "Saving…" : "Mark complete"}</button></div>)}</div>}
    </Card>
    <div className="followup-guidance"><span><ShieldCheck size={17} /></span><p><b>Follow-up completion doesn’t automatically close a case.</b> Document the required treatment or confirmation before requesting closure.</p><Link to="/patients">Review active cases <ArrowRight size={14} /></Link></div>
    {createOpen && <CreateFollowUpModal onClose={() => setCreateOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["followups"] }); await refreshPatientCase(queryClient); setCreateOpen(false); setToast("Follow-up added to the care coordination queue."); }} />}
    {toast && <Toast message={toast} onClose={() => setToast("")} />}
  </div>;
}

function CreateFollowUpModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { user } = useAuth();
  const patientsQuery = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const [patient, setPatient] = useState("");
  const [reason, setReason] = useState("");
  const [due, setDue] = useState("");
  const [owner, setOwner] = useState(isDemoMode ? "Jordan Lee" : "A. Sharma");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: followupService.create, onSuccess: onCreated, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not create follow-up.") });
  return <Modal title="Create follow-up" description="Assign a clear next step and due date to keep a patient’s care moving." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(event) => { event.preventDefault(); if (!patient || reason.trim().length < 3 || !due || !owner) { setError("Complete each field before adding the follow-up."); return; } setError(""); mutation.mutate({ patient: patient.split(" · ")[0], patientId: patient.split(" · ")[1], reason: reason.trim(), due: isDemoMode ? new Date(`${due}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : due, owner }); }}>
      <Field label="Patient"><select value={patient} onChange={(event) => setPatient(event.target.value)}><option value="">Select a patient</option>{(patientsQuery.data || []).map((p) => <option key={p.id} value={`${p.name} · ${p.id}`}>{p.name} · {p.id}</option>)}</select></Field>
      <Field label="Follow-up action"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. Confirm diagnostic appointment" /></Field>
      <div className="form-row"><Field label="Due date"><input type="date" min={new Date().toISOString().slice(0, 10)} value={due} onChange={(event) => setDue(event.target.value)} /></Field><Field label="Assigned to"><select value={owner} onChange={(event) => setOwner(event.target.value)}>{isDemoMode ? <><option>Jordan Lee</option><option>Sam Rivera</option><option>Alex Morgan</option></> :
        <><option>A. Sharma</option><option>R. Kumar</option><option>S. Iyer</option><option>M. Das</option></>}</select></Field></div>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Adding…" : "Add follow-up"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return <div className="appointment-row"><div className="appointment-date-tile"><small>{appointment.date.split(",")[0].slice(0, 3).toUpperCase()}</small><b>{appointment.date.match(/\d+/)?.[0] || "17"}</b></div><div className="appointment-row-copy"><b>{appointment.patient}</b><small>{appointment.type}</small><span><Clock3 size={12} /> {appointment.time}</span></div><Badge tone={statusTone(appointment.status)}>{appointment.status}</Badge></div>;
}

function AppointmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isPatient = user?.role === "patient";
  const query = useQuery({ queryKey: ["appointments", user?.role, user?.patientId], queryFn: () => appointmentService.list(user?.role, user?.patientId) });
  const [requestOpen, setRequestOpen] = useState(false);
  const [view, setView] = useState("Upcoming");
  const [notice, setNotice] = useState("");
  const [reschedule, setReschedule] = useState<Appointment | null>(null);
  const rows = (query.data || []).filter((item) => isPatient || view === "All appointments" || item.status !== "Completed");
  return <div className="page-stack"><PageHeader eyebrow={isPatient ? "YOUR CARE" : "CARE COORDINATION"} title={isPatient ? "My appointments" : "Appointments"} description={isPatient ? "View upcoming visits and request a different time if needed." : "Coordinate consultations, diagnostic procedures, and patient check-ins."} action={<button className="btn btn-primary" onClick={() => setRequestOpen(true)}><Plus size={16} /> {isPatient ? "Request appointment" : "Schedule appointment"}</button>} />
    <div className="appointment-highlight"><div className="highlight-icon"><CalendarDays size={20} /></div><div><span>NEXT UP</span><h2>{rows[0]?.type || "No appointments scheduled"}</h2><p>{rows[0] ? `${rows[0].patient} · ${rows[0].date} at ${rows[0].time}` : "Appointments will appear here when scheduled."}</p></div><div className="highlight-right"><Badge tone={statusTone(rows[0]?.status || "neutral")}>{rows[0]?.status || "No upcoming visit"}</Badge>{rows[0] && <button className="btn btn-secondary btn-sm" onClick={() => navigate(isPatient ? "/dashboard/patient" : `/patient/${rows[0].patientId || getPatientIdByName(rows[0].patient)}`)}>View details <ArrowRight size={14} /></button>}</div></div>
    <Card className="table-card appointments-list-card"><div className="card-heading"><div><h2>{isPatient ? "Your schedule" : "Appointment schedule"}</h2><p>All upcoming patient visits</p></div><label className="filter-select"><CalendarDays size={15} /><select value={view} onChange={(e) => setView(e.target.value)}><option>Upcoming</option><option>All appointments</option></select><ChevronDown size={14} /></label></div>
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} /> : <div className="appointment-list">{rows.map((item) => <div className="appointment-list-item" key={item.id}><AppointmentRow appointment={item} />{!isPatient && <div className="appointment-item-actions"><button className="icon-btn" title="Reschedule" aria-label={`Reschedule ${item.patient}`} onClick={() => setReschedule(item)}><CalendarDays size={16} /></button></div>}</div>)}</div>}
      {!rows.length && !query.isLoading && <EmptyState title="No appointments scheduled" description="New appointment details will appear here." />}
      <div className="table-pagination"><span><b>{rows.length}</b> appointments</span><div><button disabled><ChevronLeft size={15} /></button><button className="page-number active">1</button><button disabled><ChevronRight size={15} /></button></div></div>
    </Card>
    {requestOpen && <AppointmentRequestModal onClose={() => setRequestOpen(false)} onRequest={async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); await refreshPatientCase(queryClient); setRequestOpen(false); setNotice("Appointment request sent to the care team."); }} patientName={isPatient ? user.name : undefined} patientId={user?.patientId} />}
    {reschedule && <RescheduleModal appointment={reschedule} onClose={() => setReschedule(null)} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["appointments"] }); await refreshPatientCase(queryClient); setReschedule(null); setNotice("Appointment rescheduled and is awaiting patient confirmation."); }} />}
    {notice && <Toast message={notice} onClose={() => setNotice("")} />}
  </div>;
}

function RescheduleModal({ appointment, onClose, onSaved }: { appointment: Appointment; onClose: () => void; onSaved: () => Promise<void> }) {
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => appointmentService.reschedule(appointment.id, date), onSuccess: onSaved, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not reschedule this appointment.") });
  return <Modal title="Reschedule appointment" description={`${appointment.patient} · ${appointment.type}`} onClose={onClose}>
    <div className="form-stack modal-form"><Field label="New date"><input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></Field><div className="request-info"><Bell size={15} /><span>The patient will need to confirm the new appointment time.</span></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!date || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? "Saving…" : "Update appointment"} <CalendarDays size={14} /></button></div></div>
  </Modal>;
}

function AppointmentRequestModal({ onClose, onRequest, patientName, patientId }: { onClose: () => void; onRequest: () => Promise<void>; patientName?: string; patientId?: string }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(patientName ? `${patientName} · ${patientId || ""}` : "");
  const [date, setDate] = useState("");
  const [type, setType] = useState("Follow-up consultation");
  const [error, setError] = useState("");
  const query = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role), enabled: !patientName });
  const patientCaseQuery = useQuery({ queryKey: ["patient-case", patientId], queryFn: () => caseService.getMyCase(patientId), enabled: Boolean(patientName) });
  const mutation = useMutation({ mutationFn: () => appointmentService.request(selectedPatient.split(" · ")[0], date, type, selectedPatient.split(" · ")[1], patientCaseQuery.data?.caseId), onSuccess: onRequest, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not submit request.") });
  return <Modal title={patientName ? "Request an appointment" : "Schedule an appointment"} description="Choose a visit type and preferred date. Your care team will confirm availability." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(e) => { e.preventDefault(); if (!selectedPatient || !date || (patientName && !patientCaseQuery.data?.caseId)) { setError("Choose a patient and preferred date, and make sure your case is linked."); return; } setError(""); mutation.mutate(); }}>
      {!patientName && <Field label="Patient"><select value={selectedPatient} onChange={(e) => setSelectedPatient(e.target.value)}><option value="">Select a patient</option>{(query.data || []).map((p) => <option key={p.id} value={`${p.name} · ${p.id}`}>{p.name} · {p.id}</option>)}</select></Field>}
      <Field label="Appointment type"><select value={type} onChange={(e) => setType(e.target.value)}><option>Follow-up consultation</option><option>Diagnostic imaging</option><option>Specialist consultation</option><option>Care coordination call</option></select></Field>
      <Field label="Preferred date"><input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} /></Field>
      <div className="request-info"><Bell size={15} /><span>Your care team will contact you to confirm the appointment details.</span></div>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Sending…" : patientName ? "Send request" : "Schedule visit"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function ReferralsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["referrals", user?.role], queryFn: () => referralService.list(user?.role) });
  const [filter, setFilter] = useState("All referrals");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const rows = (query.data || []).filter((item) => filter === "All referrals" || item.status === filter);
  return <div className="page-stack"><PageHeader eyebrow="SPECIALTY CARE" title="Referrals" description="Track referred care from acceptance through the completed specialist visit." action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}><Plus size={16} /> Create referral</button>} />
    <div className="list-overview"><div><b>{query.data?.length ?? "—"}</b><span>Active referrals</span></div><div><b>{query.data?.filter((item) => item.status === "Pending").length ?? "—"}</b><span>Awaiting acceptance</span></div><div><b>{query.data?.filter((item) => item.status === "Scheduled").length ?? "—"}</b><span>Visit scheduled</span></div><div><b>6.2 days</b><span>Average time to visit</span></div></div>
    <Card className="table-card list-page-card"><div className="list-toolbar"><div className="toolbar-heading"><h2>Referral tracking</h2><p>Ensure patients connect with the care they need</p></div><label className="filter-select"><Filter size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>All referrals</option><option>Pending</option><option>Accepted</option><option>Scheduled</option></select><ChevronDown size={14} /></label></div>
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>REFERRAL</th><th>PATIENT</th><th>SPECIALTY</th><th>REFERRED TO</th><th>DATE</th><th>STATUS</th><th /></tr></thead><tbody>{rows.map((ref) => <tr key={ref.id}><td><span className="mono-link">{ref.id}</span></td><td><span className="person-cell"><Avatar initials={ref.initials} size="sm" /><span><b>{ref.patient}</b><small>Care coordination</small></span></span></td><td>{ref.specialty}</td><td>{ref.referredTo}</td><td>{ref.date}</td><td><Badge tone={statusTone(ref.status)}><i className="badge-dot" />{ref.status}</Badge></td><td><button className="row-action" aria-label={`Update referral for ${ref.patient}`} onClick={() => setSelectedReferral(ref)}><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>}
      <div className="table-pagination"><span>Showing <b>{rows.length}</b> referrals</span><div><button disabled><ChevronLeft size={15} /></button><button className="page-number active">1</button><button disabled><ChevronRight size={15} /></button></div></div>
    </Card><div className="referral-note"><span className="section-icon purple"><FileHeart size={17} /></span><div><b>Referral follow-through matters</b><p>A referral is complete only after the appointment outcome or specialist care plan is documented.</p></div><button className="inline-link" onClick={() => setGuidanceOpen(true)}>View guidance <ArrowRight size={14} /></button></div>
    {createOpen && <CreateReferralModal onClose={() => setCreateOpen(false)} onCreated={async () => { await queryClient.invalidateQueries({ queryKey: ["referrals"] }); await refreshPatientCase(queryClient); setCreateOpen(false); setNotice("Referral created and is awaiting specialist acceptance."); }} />}
    {selectedReferral && <ReferralStatusModal referral={selectedReferral} onClose={() => setSelectedReferral(null)} onSaved={async () => { await queryClient.invalidateQueries({ queryKey: ["referrals"] }); await refreshPatientCase(queryClient); setSelectedReferral(null); setNotice("Referral status updated."); }} />}
    {guidanceOpen && <Modal title="Referral follow-through" description="Keep the patient connected to the next care team." onClose={() => setGuidanceOpen(false)}><div className="guidance-list"><p><b>1. Confirm acceptance.</b> Document the receiving specialist and acceptance status.</p><p><b>2. Coordinate the visit.</b> Track the scheduled appointment and contact the patient with details.</p><p><b>3. Close the loop.</b> Record the visit outcome or specialist care plan before resolving the patient case.</p><div className="request-info"><ShieldCheck size={15} /><span>A referral being sent or accepted does not by itself complete or close a case.</span></div></div></Modal>}
    {notice && <Toast message={notice} onClose={() => setNotice("")} />}
  </div>;
}

function CreateReferralModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const { user } = useAuth();
  const patientsQuery = useQuery({ queryKey: ["patients", user?.role], queryFn: () => patientService.list(user?.role) });
  const [patient, setPatient] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [referredTo, setReferredTo] = useState("");
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: referralService.create, onSuccess: onCreated, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not create referral.") });
  return <Modal title="Create referral" description="Connect the patient with a specialist and keep the referral outcome in view." onClose={onClose}>
    <form className="form-stack modal-form" onSubmit={(event) => { event.preventDefault(); if (!patient || !specialty || referredTo.trim().length < 2) { setError("Select a patient and specialty, and enter a destination."); return; } setError(""); mutation.mutate({ patient: patient.split(" · ")[0], patientId: patient.split(" · ")[1], specialty, referredTo: referredTo.trim() }); }}>
      <Field label="Patient"><select value={patient} onChange={(event) => setPatient(event.target.value)}><option value="">Select a patient</option>{(patientsQuery.data || []).map((p) => <option key={p.id} value={`${p.name} · ${p.id}`}>{p.name} · {p.id}</option>)}</select></Field>
      <Field label="Specialty"><select value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">Select specialty</option><option>Breast imaging</option><option>Gastroenterology</option><option>Gynecology</option><option>Pulmonology</option><option>Oncology</option></select></Field>
      <Field label="Referred to"><input value={referredTo} onChange={(event) => setReferredTo(event.target.value)} placeholder="Specialist or care center" /></Field>
      {error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Creating…" : "Create referral"} <ArrowRight size={15} /></button></div>
    </form>
  </Modal>;
}

function ReferralStatusModal({ referral, onClose, onSaved }: { referral: Referral; onClose: () => void; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<Referral["status"]>(referral.status);
  const [error, setError] = useState("");
  const mutation = useMutation({ mutationFn: () => referralService.updateStatus(referral.id, status), onSuccess: onSaved, onError: (issue) => setError(issue instanceof Error ? issue.message : "Could not update referral.") });
  return <Modal title="Update referral" description={`${referral.patient} · ${referral.specialty} · ${referral.referredTo}`} onClose={onClose}>
    <div className="form-stack modal-form"><Field label="Referral progress"><select value={status} onChange={(event) => setStatus(event.target.value as Referral["status"])}><option>Pending</option><option>Accepted</option>{isDemoMode ? <option>Scheduled</option> : <><option>Completed</option><option>Rejected</option><option>Cancelled</option></>}</select></Field><div className="request-info"><FileHeart size={15} /><span>Record specialist acceptance or scheduling. The referral remains active until the visit outcome is documented.</span></div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Update referral"} <Check size={15} /></button></div></div>
  </Modal>;
}

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["notifications", user?.role, user?.patientId], queryFn: () => notificationService.list(user?.role, user?.patientId) });
  const [notice, setNotice] = useState("");
  const items = query.data || [];
  const markMutation = useMutation({ mutationFn: (id: number | string) => notificationService.setRead(id, true), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); setNotice("Notification marked as read."); }, onError: (issue) => setNotice(issue instanceof Error ? issue.message : "Could not update notification.") });
  const unreadMutation = useMutation({ mutationFn: (id: number | string) => notificationService.setRead(id, false), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); setNotice("Notification marked as unread."); }, onError: (issue) => setNotice(issue instanceof Error ? issue.message : "Could not update notification.") });
  const markAllMutation = useMutation({ mutationFn: () => notificationService.markAllRead(user?.role, user?.patientId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); setNotice("All notifications marked as read."); }, onError: (issue) => setNotice(issue instanceof Error ? issue.message : "Could not update notifications.") });
  const acknowledgeMutation = useMutation({
    mutationFn: ({ caseId, patientId }: { caseId: string; patientId: string }) => caseService.acknowledge(caseId, patientId),
    onSuccess: async (_, variables) => { await queryClient.invalidateQueries({ queryKey: ["notifications"] }); await queryClient.invalidateQueries({ queryKey: ["case-timeline", variables.caseId] }); setNotice("Care update acknowledged and added to your case history."); },
    onError: (issue) => setNotice(issue instanceof Error ? issue.message : "Could not acknowledge this care update."),
  });
  return <div className="page-stack"><PageHeader eyebrow="UPDATES & REMINDERS" title="Notifications" description="Stay informed about care milestones and follow-ups that need attention." action={<button className="btn btn-secondary" disabled={markAllMutation.isPending} onClick={() => markAllMutation.mutate()}><CheckCheck size={15} /> Mark all as read</button>} />
    <Card className="notifications-card"><div className="notifications-toolbar"><div><h2>Recent updates</h2><p>{items.filter((item) => item.unread).length} unread notifications</p></div><button className="select-button" onClick={() => { void queryClient.invalidateQueries({ queryKey: ["notifications"] }); setNotice("Notifications refreshed."); }}>Refresh <Activity size={14} /></button></div>
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState error={(query.error as Error).message} onRetry={() => void query.refetch()} /> : items.length ? <div className="notification-list">{items.map((item) => <article className={`notification-item ${item.unread ? "unread" : ""}`} key={item.id}><span className={`notification-icon ${item.tone}`}><Bell size={17} /></span><div className="notification-copy"><div><b>{item.title}</b>{item.unread && <i />}</div><p>{item.description}</p><small>{item.createdAt ? formatDateTime(item.createdAt) : item.time}</small>{user?.role === "patient" && <div className="notification-case-link"><Link to="/my-case">View case details <ArrowRight size={13} /></Link>{item.acknowledgedAt && <span>Acknowledged {formatDateTime(item.acknowledgedAt)}</span>}</div>}</div>{user?.role === "patient" && item.caseId && item.patientId ? <button className="btn btn-secondary btn-sm notification-ack" disabled={Boolean(item.acknowledgedAt) || acknowledgeMutation.isPending} onClick={() => acknowledgeMutation.mutate({ caseId: item.caseId!, patientId: item.patientId! })}>{item.acknowledgedAt ? "Acknowledged" : acknowledgeMutation.isPending ? "Saving…" : "Acknowledge"}</button> : <button className="icon-btn notification-action" title={item.unread ? "Mark as read" : "Mark as unread"} onClick={() => item.unread ? markMutation.mutate(item.id) : unreadMutation.mutate(item.id)}>{item.unread ? <Check size={16} /> : <MoreHorizontal size={17} />}</button>}</article>)}</div> : <EmptyState title="You’re all caught up" description="New patient and care-team updates will appear here." />}
    </Card>{notice && <Toast message={notice} onClose={() => setNotice("")} />}
  </div>;
}

function AnalyticsPage() {
  const query = useQuery({ queryKey: ["patients", "admin"], queryFn: () => patientService.list("admin") });
  const [period, setPeriod] = useState("Last 6 months");
  return <div className="page-stack"><PageHeader eyebrow="NETWORK PERFORMANCE" title="Analytics & reports" description="Measure screening follow-through and find opportunities to improve care continuity." action={<button className="btn btn-secondary" onClick={() => window.print()}><Download size={15} /> Export report</button>} /><div className="demo-data-banner" role="note">Simulated demo analytics · these illustrative metrics are not live database aggregates.</div>
    <div className="analytics-filter-row"><span><i className="status-live" /> Network-wide analytics · Updated just now</span><label className="filter-select"><CalendarDays size={15} /><select value={period} onChange={(e) => setPeriod(e.target.value)}><option>Last 6 months</option><option>Last 30 days</option><option>This year</option></select><ChevronDown size={14} /></label></div>
    <div className="metric-grid analytics-metrics"><MetricCard title="Screening completion" value="78.6%" change="+6.2%" icon={ClipboardList} tone="blue" note="vs. previous period" /><MetricCard title="Abnormal results" value="148" change="5.8%" icon={Activity} tone="amber" note="of all screenings" /><MetricCard title="Closed-loop rate" value="82.4%" change="+4.2%" icon={CheckCheck} tone="green" note="documented care complete" /><MetricCard title="Median time to follow-up" value="6.2 days" change="−1.4 days" icon={Clock3} tone="teal" note="from result to visit" /></div>
    <div className="analytics-charts-grid"><Card className="chart-card"><div className="card-heading"><div><h2>Screenings & care closure</h2><p>Volume by month · {period.toLowerCase()}</p></div><button className="icon-btn" aria-label="Print chart" title="Print chart" onClick={() => window.print()}><Download size={16} /></button></div><div className="line-chart analytics-line-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="analyticsScreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4387ed" stopOpacity={0.14} /><stop offset="100%" stopColor="#4387ed" stopOpacity={0} /></linearGradient><linearGradient id="analyticsClose" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#27ad9b" stopOpacity={0.13} /><stop offset="100%" stopColor="#27ad9b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#98a2b3", fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="screened" stroke="#4387ed" strokeWidth={2.5} fill="url(#analyticsScreen)" /><Area type="monotone" dataKey="closed" stroke="#27ad9b" strokeWidth={2.5} fill="url(#analyticsClose)" /></AreaChart></ResponsiveContainer></div><div className="chart-bottom"><span><i className="legend-blue" /> Screenings <i className="legend-teal" /> Closed cases</span><span>Patients in network: {query.data?.length ?? "—"} demo records</span></div></Card>
      <Card className="distribution-card"><div className="card-heading"><div><h2>Screenings by type</h2><p>Share of completed screenings</p></div><button className="icon-btn" aria-label="Print chart" title="Print chart" onClick={() => window.print()}><Download size={16} /></button></div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distributionData} dataKey="value" innerRadius={65} outerRadius={88} paddingAngle={3} stroke="none">{distributionData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="donut-center"><b>1,284</b><small>SCREENINGS</small></div></div><div className="distribution-legend">{distributionData.map((item) => <div key={item.name}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><b>{item.value}%</b></div>)}</div></Card></div>
    <div className="analytics-lower"><Card className="performance-card"><div className="card-heading"><div><h2>Care pathway performance</h2><p>Case closure progress by screening type</p></div><button className="inline-link" onClick={() => window.print()}>Download <Download size={14} /></button></div>{[{ label: "Mammography", value: 88, text: "88%" }, { label: "Colorectal screening", value: 79, text: "79%" }, { label: "Cervical screening", value: 84, text: "84%" }, { label: "Lung screening", value: 73, text: "73%" }].map((row, i) => <div className="performance-row" key={row.label}><span>{row.label}</span><div className="performance-track"><i className={`performance-fill fill-${i}`} style={{ width: `${row.value}%` }} /></div><b>{row.text}</b></div>)}</Card><div className="analytics-callout"><span className="analytics-callout-icon"><Sparkles size={18} /></span><div className="eyebrow">NETWORK INSIGHT</div><h3>Follow-up is trending in the right direction.</h3><p>More patients are completing their next step within the 14-day target compared to last period.</p><div><span><ArrowUpRight size={14} /> 5.1%</span> improvement this period</div></div></div>
  </div>;
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 4000); return () => window.clearTimeout(timer); }, [onClose]);
  return <div className="toast"><span><Check size={15} /></span><p>{message}</p><button className="icon-btn" aria-label="Dismiss notification" onClick={onClose}><X size={15} /></button></div>;
}
