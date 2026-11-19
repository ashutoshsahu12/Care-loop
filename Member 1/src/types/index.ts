export type Role = "admin" | "doctor" | "worker" | "patient";
export type CaseStatus =
  | "In progress"
  | "Awaiting patient"
  | "Appointment scheduled"
  | "Referred"
  | "Overdue"
  | "Resolved"
  | "Closed";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  initials: string;
  specialty?: string;
  patientId?: string;
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  location: string;
  screening: string;
  result: string;
  status: CaseStatus;
  priority: "High" | "Medium" | "Routine";
  doctor: string;
  coordinator: string;
  lastActivity: string;
  nextAction: string;
  appointment?: string;
  caseId?: string;
  dueAt?: string;
  priorityReason?: string;
  screeningDate?: string;
  reviewState?: string;
  closureRecord?: {
    outcome: string;
    evidenceNote: string;
    verifiedBy: string;
    verifiedAt: string;
  };
  clinicalNotes?: { id: string; author: string; createdAt: string; text: string }[];
  communicationLog?: { id: string; createdAt: string; channel: string; outcome: string }[];
}

export interface CaseTimelineEvent {
  id: string;
  caseId: string;
  patientId: string;
  eventType: string;
  description: string;
  actorName: string;
  actorRole: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patient: string;
  patientId?: string;
  initials: string;
  type: string;
  date: string;
  time: string;
  clinician: string;
  status: "Confirmed" | "Needs confirmation" | "Completed" | "Missed";
}

export interface Referral {
  id: string;
  patient: string;
  patientId?: string;
  initials: string;
  specialty: string;
  referredTo: string;
  date: string;
  status: "Accepted" | "Pending" | "Scheduled";
}

export interface FollowUp {
  id: string;
  patient: string;
  patientId?: string;
  initials: string;
  reason: string;
  due: string;
  owner: string;
  status: "Overdue" | "Due today" | "Upcoming" | "Completed";
  escalated?: boolean;
}

export interface Screening {
  id: string;
  patient: string;
  patientId?: string;
  initials: string;
  type: string;
  date: string;
  result: string;
  status: "Abnormal" | "Normal" | "Pending review";
  clinician: string;
  recordedAt?: string;
  priority?: Patient["priority"];
  priorityReason?: string;
  reviewState?: string;
}

export interface PatientCase {
  caseId: string;
  patientId: string;
  patientReference: string;
  status: CaseStatus;
  priority: Patient["priority"];
  priorityReason: string;
  assignedTo: string;
  careCoordinator: string;
  nextAction: string;
  dueAt: string;
  screening: Screening;
  referrals: Referral[];
  appointments: Appointment[];
  followups: FollowUp[];
}

export interface CareNotification {
  id: string | number;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  tone: string;
  patientId?: string;
  caseId?: string;
  createdAt?: string;
  acknowledgedAt?: string | null;
}
