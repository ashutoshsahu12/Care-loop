/**
 * Types aligned with Member 3 Admin, Monitoring & Analytics specifications.
 */

export type CaseStatus =
  | "screening"
  | "referred"
  | "appointment_scheduled"
  | "in_care"
  | "completed"
  | "overdue"
  | "unassigned";

export type Priority = "low" | "medium" | "high" | "critical";

export interface AdminOverview {
  totalPatients: number;
  totalCases: number;
  pendingCases: number;
  completedCases: number;
  overdueCases: number;
  unassignedCases: number;
  lastUpdated: string;
}

export interface CaseRecord {
  id: string;
  patientReference: string;
  status: CaseStatus;
  assignedCareWorker: string | null;
  nextAction: string;
  dueDate: string | null;
  lastActivityAt: string;
  priority: Priority;
}

export type EscalationType =
  | "overdue_referral"
  | "missed_appointment"
  | "unacknowledged_notification"
  | "unresolved_case"
  | "unassigned_case";

export interface EscalationRecord {
  id: string;
  caseId: string;
  patientReference: string;
  type: EscalationType;
  reason: string;
  responsiblePerson: string | null;
  createdAt: string;
  overdueDays: number;
  priority: Priority;
}

export type FollowUpRiskReason =
  | "overdue_acknowledgement"
  | "pending_referral"
  | "missed_appointment"
  | "no_recent_follow_up";

export interface AtRiskCase {
  caseId: string;
  patientReference: string;
  reasons: FollowUpRiskReason[];
  overdueDays: number;
  lastActivityAt: string;
  suggestedNextAction: string;
  assignedCareWorker: string | null;
  riskLevel: Priority;
}

export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit: "count" | "percentage" | "hours" | "days";
  previousValue?: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AdminAnalytics {
  referralCompletionRate: number;
  appointmentAttendanceRate: number;
  notificationAcknowledgementRate: number;
  averageTimeToConsultationHours: number;
  verifiedClosureRate: number;
  unresolvedCases: number;
  referralCompletionTrend: TimeSeriesPoint[];
  appointmentAttendanceTrend: TimeSeriesPoint[];
}

export interface CaseFilters {
  status?: CaseStatus | "all";
  priority?: Priority | "all";
  assignedCareWorker?: string | "all" | "unassigned";
  search?: string;
}
