import type { CaseStatus, Priority } from "./admin";
import type { UserRole } from "./auth";

export interface Patient {
  id: string;
  patientReference: string;
  name: string;
  dateOfBirth: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScreeningUrgency = "routine" | "urgent" | "critical";
export type ScreeningStatus = "pending_review" | "reviewed" | "escalated";

export interface ScreeningResult {
  id: string;
  patientId: string;
  screeningType: string;
  resultValue: string;
  score?: number | null;
  urgency: ScreeningUrgency;
  status: ScreeningStatus;
  rawPayload?: Record<string, unknown> | null;
  clinicianNotes?: string | null;
  submittedById?: string | null;
  createdAt: string;
}

export interface CareCase {
  id: string;
  patientId: string;
  screeningResultId?: string | null;
  status: CaseStatus;
  priority: Priority;
  ownerId: string | null;
  assignedCareWorkerName: string | null;
  nextAction: string;
  dueAt: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export type ReferralStatus =
  | "pending_acceptance"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled";

export interface Referral {
  id: string;
  caseId: string;
  referringProviderId: string;
  targetFacility: string;
  specialty: string;
  urgency: ScreeningUrgency;
  status: ReferralStatus;
  notes?: string | null;
  handoffClinicianId?: string | null;
  handoffNotes?: string | null;
  acknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "attended"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export interface Appointment {
  id: string;
  caseId: string;
  referralId?: string | null;
  scheduledTime: string;
  facility: string;
  providerName: string;
  status: AppointmentStatus;
  attendanceNotes?: string | null;
  recordedById?: string | null;
  recordedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | "screening_result"
  | "referral_sent"
  | "appointment_reminder"
  | "care_worker_escalation";

export type NotificationStatus = "sent" | "delivered" | "acknowledged";

export interface Notification {
  id: string;
  caseId?: string | null;
  recipientId: string;
  recipientRole: UserRole;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface FollowUpTask {
  id: string;
  caseId: string;
  assignedToId: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: TaskStatus;
  completedAt?: string | null;
  completedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ClosureOutcome =
  | "care_completed"
  | "treatment_plan_established"
  | "declined_care"
  | "lost_to_follow_up_exhausted";

export interface ClosureRecord {
  id: string;
  caseId: string;
  outcome: ClosureOutcome;
  verificationActorId: string;
  verificationActorRole: "clinician" | "admin";
  evidenceNote: string;
  verifiedAt: string;
  createdAt: string;
}
