/** Adapters between Member 2's canonical REST objects and Member 1's display models.
 *  Kept separate so existing standalone frontend demo data remains unchanged.
 */
import { api } from "./api";
import type { Appointment, CaseStatus, CaseTimelineEvent, FollowUp, Patient, PatientCase, Referral, Screening } from "../types";

export interface BackendCase {
  id: string; patientId: string; status: string; priority: string;
  assignedCareWorkerName?: string | null; nextAction: string; dueAt: string;
  lastActivityAt: string; patientReference?: string; patientName?: string;
}
export interface BackendPatient {
  id: string; patientReference: string; name: string; dateOfBirth?: string;
  gender?: string | null; phone?: string | null; email?: string | null; address?: string | null;
}
export interface BackendScreening {
  id: string; screeningType: string; resultValue: string; createdAt: string;
  status: string; clinicianNotes?: string | null;
}
export interface BackendReferral {
  id: string; specialty: string; targetFacility: string; createdAt: string; status: string;
}
export interface BackendAppointment {
  id: string; scheduledTime: string; providerName: string; facility: string; status: string;
}
export interface BackendTask {
  id: string; title: string; description?: string; dueDate: string; status: string; assignedToId: string;
}
export interface BackendEvent {
  id: string; caseId: string; eventType: string; summary: string; actorId: string;
  actorRole: string; createdAt: string;
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
  unreadNotifications: Array<{ id: string; caseId?: string; title: string; message: string; createdAt: string; status: string }>;
}

export const BACKEND_DEMO_PATIENT_REF = "CL-P-1001";
export const BACKEND_DEMO_PATIENT_ID = "pat-1001";

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
    doctor: "Care team", coordinator: c.assignedCareWorkerName || "Unassigned",
    lastActivity: dateLabel(c.lastActivityAt), nextAction: c.nextAction,
    caseId: c.id, dueAt: c.dueAt, screeningDate: dateLabel(s?.createdAt),
    priorityReason: "Priority assigned by the care-coordination workflow.",
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
    status: /\b(normal|negative|within range)\b/i.test(s.resultValue) && !/abnormal|positive|high|suspicious/i.test(s.resultValue) ? "Normal" : "Abnormal", clinician: "Care team",
    reviewState: s.status.replace(/_/g, " "),
  };
}
export function toReferral(d: BackendCaseDetail, r: BackendReferral): Referral {
  return {
    id: r.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), specialty: r.specialty, referredTo: r.targetFacility,
    date: dateLabel(r.createdAt),
    status: r.status === "accepted" || r.status === "completed" ? "Accepted" : r.status === "pending_acceptance" ? "Pending" : "Scheduled",
  };
}
export function toAppointment(d: BackendCaseDetail, a: BackendAppointment): Appointment {
  return {
    id: a.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), type: a.facility, date: dateLabel(a.scheduledTime),
    time: new Date(a.scheduledTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    clinician: a.providerName,
    status: a.status === "attended" ? "Completed" : a.status === "no_show" ? "Missed" : "Confirmed",
  };
}
export function toFollowUp(d: BackendCaseDetail, t: BackendTask): FollowUp {
  const due = new Date(t.dueDate).getTime();
  return {
    id: t.id, patient: d.patient.name, patientId: d.patient.patientReference,
    initials: initials(d.patient.name), reason: t.title, due: dateLabel(t.dueDate),
    owner: d.caseRecord.assignedCareWorkerName ?? t.assignedToId,
    status: t.status === "completed" ? "Completed" : due < Date.now() ? "Overdue" : "Upcoming",
  };
}
export function toEvent(e: BackendEvent, patientReference: string): CaseTimelineEvent {
  return { id: e.id, caseId: e.caseId, patientId: patientReference, eventType: e.eventType,
    description: e.summary, actorName: e.actorId, actorRole: e.actorRole, createdAt: e.createdAt };
}
export async function getCaseDetails(caseId: string): Promise<BackendCaseDetail> {
  return (await api.get<BackendCaseDetail>(`/cases/${encodeURIComponent(caseId)}`)).data;
}
export async function getAllCaseDetails(): Promise<BackendCaseDetail[]> {
  const rows = (await api.get<Array<{ id: string }>>("/cases")).data;
  return Promise.all(rows.map(row => getCaseDetails(row.id)));
}
export async function getPatientSummary(patientRef = BACKEND_DEMO_PATIENT_REF): Promise<BackendPatientSummary> {
  return (await api.get<BackendPatientSummary>("/patient/summary", { params: { patientId: patientRef } })).data;
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
