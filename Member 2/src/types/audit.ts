import type { CaseStatus } from "./admin";
import type { UserRole } from "./auth";

export type CaseEventType =
  | "case_created"
  | "case_assigned"
  | "case_reassigned"
  | "status_changed"
  | "patient_acknowledged"
  | "help_requested"
  | "clinical_review"
  | "followup_activity"
  | "referral_created"
  | "referral_status_updated"
  | "clinician_handoff"
  | "appointment_scheduled"
  | "appointment_rescheduled"
  | "attendance_recorded"
  | "follow_up_task_created"
  | "follow_up_task_completed"
  | "escalation_triggered"
  | "verified_closure";

export interface CaseEvent {
  id: string;
  caseId: string;
  actorId: string;
  actorRole: UserRole;
  eventType: CaseEventType;
  fromStatus?: CaseStatus | null;
  toStatus?: CaseStatus | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
