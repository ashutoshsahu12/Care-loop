/** Adapters between Member 2's canonical REST objects and Member 1's display models.
 *  Kept separate so existing standalone frontend demo data remains unchanged.
 */
import { api } from "./api";
import type { Appointment, CaseStatus, CaseTimelineEvent, FollowUp, Patient, PatientCase, Referral, Role, Screening } from "../types";

export interface BackendCase {
  id: string; patientId: string; status: string; priority: string; ownerId?: string | null;
  assignedCareWorkerName?: string | null; nextAction: string; dueAt: string;
  lastActivityAt: string; createdAt?: string; patientReference?: string; patientName?: string;
}
export interface BackendPatient {
  id: string; patientReference: string; name: string; dateOfBirth?: string;
  gender?: string | null; phone?: string | null; email?: string | null; address?: string | null;
}
export interface BackendScreening {
  id: string; screeningType: string; resultValue: string; createdAt: string;
  status: string; clinicianNotes?: string | null; submittedById?: string | null; score?: number | null;
}
export interface BackendReferral {
  id: string; specialty: string; targetFacility: string; createdAt: string; status: string;
  referringProviderId?: string; handoffClinicianId?: string | null;
}
export interface BackendAppointment {
  id: string; scheduledTime: string; providerName: string; facility: string; status: string;
  referralId?: string | null;
}
export interface BackendTask {
  id: string; title: string; description?: string; dueDate: string; status: string; assignedToId: string;
}
export interface BackendEvent {
  id: string; caseId: string; eventType: string; summary: string; actorId: string;
  actorRole: string; createdAt: string; metadata?: Record<string, unknown> | null;
}
export interface BackendCaseDetail {
  caseRecord: BackendCase; patient: BackendPatient;
  screeningResult: BackendScreening | null;
  referrals: BackendReferral[]; appointments: BackendAppointment[];
  tasks: BackendTask[]; timeline: BackendEvent[];
  closureRecord?: { outcome: string; evidenceNote: string; verificationActorId: string; verifiedAt: string } | null;
}
export interface BackendPatientSummary {
  patient: BackendPatient;
  activeCase: { id: string; status: string; priority: string; nextStep: string; targetDate: string } | null;
  upcomingAppointments: BackendAppointment[];
  unreadNotifications: Array<{ id: string; caseId?: string; title: string; message: string; createdAt: string; status: string; acknowledgedAt?: string | null }>;
}

export const BACKEND_DEMO_PATIENT_REF = "CL-P-1001";
export const BACKEND_DEMO_PATIENT_ID = "pat-1001";
export const DEMO_CLINICIAN_NAMES: Record<string, string> = {
  "usr-clin-1": "Dr. Neha Verma",
  "usr-clin-2": "Dr. Rajesh Gupta",
};

export function displayStatus(status: string): CaseStatus {
  const map: Record<string, CaseStatus> = {
    unassigned: "In progress", screening: "In progress", referred: "Referred",
    appointment_scheduled: "Appointment scheduled", in_care: "In care",
    overdue: "Overdue", completed: "Closed",
  };
  return map[status] ?? "In progress";
}
export function backendStatus(status: CaseStatus): string {
  const map: Record<CaseStatus, string> = {
    "In progress": "screening", "Awaiting patient": "screening",
    "Appointment scheduled": "appointment_scheduled", Referred: "referred",
    Overdue: "overdue", "In care": "in_care", Resolved: "in_care", Closed: "completed",
  };
  return map[status];
}
export function displayPriority(priority: string): Patient["priority"] {
  return priority === "critical" || priority === "high" ? "High" : priority === "medium" ? "Medium" : "Routine";
}
export function dateLabel(iso: string | undefined): string {
  if (!iso) return "Not scheduled";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase();
}
export function toUnscreenedPatient(patient: BackendPatient): Patient {
  const parsed = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const age = parsed && !Number.isNaN(parsed.getTime()) ? Math.max(0, new Date().getFullYear() - parsed.getFullYear()) : 0;
  return {
    id: patient.patientReference, name: patient.name, initials: initials(patient.name),
    age, gender: patient.gender ?? "Not specified", phone: patient.phone ?? "",
    email: patient.email ?? "", location: patient.address ?? "Care network",
    screening: "Not yet screened", result: "Awaiting screening",
    status: "In progress", priority: "Routine", doctor: "Unassigned",
    coordinator: "Unassigned", lastActivity: "New registration",
    nextAction: "Record screening",
  };
}
export async function getAllBackendPatients(): Promise<BackendPatient[]> {
  return (await api.get<BackendPatient[]>("/patients")).data;
}
export async function getBackendPatient(idOrReference: string): Promise<BackendPatient> {
  return (await api.get<BackendPatient>(`/patients/${encodeURIComponent(idOrReference)}`)).data;
}

export function toPatient(detail: BackendCaseDetail): Patient {
  const { patient, caseRecord: c, screeningResult: s } = detail;
  const dob = patient.dateOfBirth ? new Date(patient.dateOfBirth) : null;
  const age = dob && !Number.isNaN(dob.getTime()) ? Math.max(0, new Date().getFullYear() - dob.getFullYear()) : 0;
  return {
    id: patient.patientReference, name: patient.name, initials: initials(patient.name),
    age, gender: patient.gender ?? "Not specified", phone: patient.phone ?? "",
    email: patient.email ?? "", location: patient.address ?? "Care network",
    screening: s?.screeningType ?? "Screening", result: s?.resultValue ?? "Awaiting review",
    status: displayStatus(c.status), priority: displayPriority(c.priority),
    doctor: DEMO_CLINICIAN_NAMES[detail.referrals.find(referral => referral.handoffClinicianId)?.handoffClinicianId ?? s?.submittedById ?? ""] ?? "Care team", coordinator: c.assignedCareWorkerName || "Unassigned",
    lastActivity: dateLabel(c.lastActivityAt), nextAction: c.nextAction,
    caseId: c.id, dueAt: c.dueAt, screeningDate: dateLabel(s?.createdAt),
    priorityReason: "Priority assigned by the care-coordination workflow.",
    clinicalNotes: detail.timeline.filter(event => event.eventType === "clinical_review").map(event => ({
      id: event.id, text: event.summary, createdAt: dateLabel(event.createdAt),
      author: DEMO_CLINICIAN_NAMES[event.actorId] ?? DEMO_WORKER_NAMES[event.actorId] ?? event.actorId,
    })),
    communicationLog: detail.timeline.filter(event => event.eventType === "followup_activity").map(event => ({
      id: event.id, createdAt: dateLabel(event.createdAt),
      channel: typeof event.metadata?.channel === "string" ? event.metadata.channel : "Outreach",
      outcome: typeof event.metadata?.outcome === "string" ? event.metadata.outcome : event.summary,
    })),
    closureRecord: detail.closureRecord ? {
      outcome: detail.closureRecord.outcome, evidenceNote: detail.closureRecord.evidenceNote,
      verifiedBy: detail.closureRecord.verificationActorId, verifiedAt: detail.closureRecord.verifiedAt,
    } : undefined,
  };
}
export function toScreening(detail: BackendCaseDetail): Screening | null {
  const s = detail.screeningResult;
  if (!s) return null;
  return {
    id: s.id, patient: detail.patient.name, patientId: detail.patient.patientReference,
    initials: initials(detail.patient.name), type: s.screeningType,
    date: dateLabel(s.createdAt), recordedAt: s.createdAt, result: s.resultValue,
    status: /\b(normal|negative|within range)\b/i.test(s.resultValue) && !/abnormal|positive|high|suspicious/i.test(s.resultValue)
      ? "Normal" : /abnormal|positive|high|suspicious|birads|stage [12]/i.test(s.resultValue)
        ? "Abnormal" : "Pending review", clinician: "Care team",
    reviewState: s.status.replace(/_/g, " "),
  };
}
/** Seeded demo care worker directory. Task ownership is separate from case ownership. */
export const DEMO_WORKER_NAMES: Record<string, string> = {
  "usr-cw-1": "A. Sharma",
  "usr-cw-2": "R. Kumar",
  "usr-cw-3": "S. Iyer",
  "usr-cw-4": "M. Das",
};
export function toReferral(d: BackendCaseDetail, r: BackendReferral): Referral {
  return {
    id: r.id, caseId: d.caseRecord.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), specialty: r.specialty, referredTo: r.targetFacility,
    date: dateLabel(r.createdAt),
    status: r.status === "pending_acceptance" ? "Pending"
      : r.status === "completed" ? "Completed"
      : r.status === "rejected" ? "Rejected"
      : r.status === "cancelled" ? "Cancelled"
      : d.appointments.some(apt => apt.referralId === r.id && apt.status === "scheduled") ? "Scheduled" : "Accepted",
  };
}
export function toAppointment(d: BackendCaseDetail, a: BackendAppointment): Appointment {
  return {
    id: a.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), type: a.facility, date: dateLabel(a.scheduledTime),
    time: new Date(a.scheduledTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    clinician: a.providerName,
    status: a.status === "attended" ? "Completed"
      : a.status === "no_show" ? "Missed"
      : a.status === "cancelled" ? "Cancelled"
      : a.status === "rescheduled" ? "Rescheduled"
      : "Confirmed",
  };
}
export function toFollowUp(d: BackendCaseDetail, t: BackendTask): FollowUp {
  const dueDate = t.dueDate.slice(0, 10);
  const localToday = new Date();
  const today = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
  return {
    id: t.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), reason: t.title, due: dateLabel(t.dueDate),
    owner: DEMO_WORKER_NAMES[t.assignedToId] ?? t.assignedToId,
    status: t.status === "completed" ? "Completed"
      : t.status === "cancelled" ? "Cancelled"
      : dueDate < today ? "Overdue"
      : dueDate === today ? "Due today" : "Upcoming",
  };
}
export function toEvent(e: BackendEvent, patientReference: string): CaseTimelineEvent {
  return { id: e.id, caseId: e.caseId, patientId: patientReference, eventType: e.eventType,
    description: e.eventType === "help_requested" && typeof e.metadata?.message === "string" ? e.metadata.message : e.summary,
    actorName: DEMO_CLINICIAN_NAMES[e.actorId] ?? DEMO_WORKER_NAMES[e.actorId] ?? e.actorId,
    actorRole: e.actorRole, createdAt: e.createdAt };
}
export async function getCaseDetails(caseId: string): Promise<BackendCaseDetail> {
  return (await api.get<BackendCaseDetail>(`/cases/${encodeURIComponent(caseId)}`)).data;
}
// Share a short-lived in-flight snapshot among patient, referral, task and appointment
// list requests. Never reuse another demo user's snapshot, and invalidate on mutations.
let caseSnapshot: {
  identity: string; expiresAt: number; promise: Promise<BackendCaseDetail[]>;
} | null = null;

export function invalidateCaseDetailsCache(): void {
  caseSnapshot = null;
}

api.interceptors.response.use(response => {
  const method = response.config.method?.toLowerCase();
  if (method && !["get", "head", "options"].includes(method)) invalidateCaseDetailsCache();
  return response;
});

export function getAllCaseDetails(): Promise<BackendCaseDetail[]> {
  const identity = typeof localStorage === "undefined"
    ? "server" : (localStorage.getItem("careloop.accessToken") ?? "anonymous");
  if (caseSnapshot && caseSnapshot.identity === identity && caseSnapshot.expiresAt > Date.now()) {
    return caseSnapshot.promise;
  }
  const promise = (async () => {
    const rows = (await api.get<Array<{ id: string }>>("/cases")).data;
    return Promise.all(rows.map(row => getCaseDetails(row.id)));
  })();
  const snapshot = { identity, expiresAt: Date.now() + 1200, promise };
  caseSnapshot = snapshot;
  void promise.catch(() => {
    if (caseSnapshot === snapshot) caseSnapshot = null;
  });
  return promise;
}
export async function getPatientSummary(patientRef = BACKEND_DEMO_PATIENT_REF): Promise<BackendPatientSummary> {
  return (await api.get<BackendPatientSummary>("/patient/summary", { params: { patientId: patientRef } })).data;
}
/** Filter rendered care-team lists to the selected seeded demo identity.
 * Server-side authorization remains a separate prerequisite for real patient data.
 */
export function visibleCaseDetails(
  details: BackendCaseDetail[], role?: Role, patientRef?: string
): BackendCaseDetail[] {
  if (role === "patient") {
    return details.filter(detail => detail.patient.patientReference === (patientRef || BACKEND_DEMO_PATIENT_REF));
  }
  if (role === "worker") {
    return details.filter(detail => detail.caseRecord.ownerId === "usr-cw-1");
  }
  if (role === "doctor") {
    return details.filter(detail =>
      detail.screeningResult?.submittedById === "usr-clin-1" ||
      detail.referrals.some(referral =>
        referral.referringProviderId === "usr-clin-1" ||
        referral.handoffClinicianId === "usr-clin-1") ||
      detail.timeline.some(event => event.actorId === "usr-clin-1")
    );
  }
  return details;
}

/** Choose the newest case among records visible to the current role, not before
 * applying assignment scoping. An older assigned case may coexist with a newer
 * case assigned to another care worker.
 */
export function latestVisibleCases(
  all: BackendCaseDetail[], role?: Role, patientRef?: string
): BackendCaseDetail[] {
  const latest = new Map<string, BackendCaseDetail>();
  for (const detail of visibleCaseDetails(all, role, patientRef)) {
    const ref = detail.patient.patientReference;
    const previous = latest.get(ref);
    if (!previous || (detail.caseRecord.createdAt ?? detail.caseRecord.lastActivityAt) >
      (previous.caseRecord.createdAt ?? previous.caseRecord.lastActivityAt)) {
      latest.set(ref, detail);
    }
  }
  return [...latest.values()];
}

/** Registration queue for screening: only records without any case.
 * Other staff members' existing assigned cases must not leak into the intake list.
 */
export function unscreenedRegistrations(
  registered: BackendPatient[], cases: BackendCaseDetail[]
): Patient[] {
  const withCases = new Set(cases.map(detail => detail.patient.patientReference));
  return registered.filter(patient => !withCases.has(patient.patientReference))
    .map(toUnscreenedPatient);
}

export async function findDetailByPatientRef(patientRef: string): Promise<BackendCaseDetail | undefined> {
  const all = await getAllCaseDetails();
  return all.find(item => item.patient.patientReference === patientRef || item.patient.id === patientRef);
}
export function toPatientCase(d: BackendCaseDetail): PatientCase {
  return {
    caseId: d.caseRecord.id, patientId: d.patient.patientReference,
    patientReference: d.patient.patientReference, status: displayStatus(d.caseRecord.status),
    priority: displayPriority(d.caseRecord.priority),
    priorityReason: "Human review guided by deterministic screening rules.",
    assignedTo: "Care team", careCoordinator: d.caseRecord.assignedCareWorkerName ?? "Unassigned",
    nextAction: d.caseRecord.nextAction, dueAt: d.caseRecord.dueAt,
    screening: toScreening(d) ?? {
      id: "", patient: d.patient.name, patientId: d.patient.patientReference,
      initials: initials(d.patient.name), type: "Screening", date: "",
      result: "Awaiting review", status: "Pending review", clinician: "Care team",
    },
    referrals: d.referrals.map(r => toReferral(d, r)),
    appointments: d.appointments.map(a => toAppointment(d, a)),
    followups: d.tasks.map(t => toFollowUp(d, t)),
  };
}
