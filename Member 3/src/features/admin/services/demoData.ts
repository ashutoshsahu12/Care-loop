import type {
  AdminAnalytics,
  AdminOverview,
  AtRiskCase,
  CaseRecord,
  EscalationRecord,
} from "../../../types/admin";

/**
 * Synthetic CARELOOP demonstration data.
 * These records are fictional and must never be replaced with identifiable
 * patient information in a demo repository.
 */
export const demoOverview: AdminOverview = {
  totalPatients: 248,
  totalCases: 276,
  pendingCases: 64,
  completedCases: 171,
  overdueCases: 18,
  unassignedCases: 9,
  lastUpdated: "2026-11-17T10:30:00.000Z",
};

export const demoCases: CaseRecord[] = [
  { id: "CL-1001", patientReference: "CL-P-1001", status: "screening", assignedCareWorker: "A. Sharma", nextAction: "Review screening result", dueDate: "2026-11-18", lastActivityAt: "2026-11-16T09:30:00Z", priority: "medium" },
  { id: "CL-1002", patientReference: "CL-P-1002", status: "referred", assignedCareWorker: "R. Kumar", nextAction: "Confirm referral acceptance", dueDate: "2026-11-15", lastActivityAt: "2026-11-12T11:15:00Z", priority: "high" },
  { id: "CL-1003", patientReference: "CL-P-1003", status: "appointment_scheduled", assignedCareWorker: "S. Iyer", nextAction: "Confirm appointment attendance", dueDate: "2026-11-20", lastActivityAt: "2026-11-16T14:20:00Z", priority: "low" },
  { id: "CL-1004", patientReference: "CL-P-1004", status: "in_care", assignedCareWorker: "M. Das", nextAction: "Record follow-up outcome", dueDate: "2026-11-14", lastActivityAt: "2026-11-10T08:00:00Z", priority: "critical" },
  { id: "CL-1005", patientReference: "CL-P-1005", status: "completed", assignedCareWorker: "A. Sharma", nextAction: "Verify case closure", dueDate: "2026-11-13", lastActivityAt: "2026-11-13T16:45:00Z", priority: "low" },
  { id: "CL-1006", patientReference: "CL-P-1006", status: "overdue", assignedCareWorker: "R. Kumar", nextAction: "Contact referral centre", dueDate: "2026-11-09", lastActivityAt: "2026-11-08T10:10:00Z", priority: "critical" },
  { id: "CL-1007", patientReference: "CL-P-1007", status: "unassigned", assignedCareWorker: null, nextAction: "Assign a care worker", dueDate: "2026-11-19", lastActivityAt: "2026-11-15T12:00:00Z", priority: "high" },
  { id: "CL-1008", patientReference: "CL-P-1008", status: "referred", assignedCareWorker: "S. Iyer", nextAction: "Check referral acknowledgement", dueDate: "2026-11-16", lastActivityAt: "2026-11-11T09:45:00Z", priority: "high" },
  { id: "CL-1009", patientReference: "CL-P-1009", status: "screening", assignedCareWorker: "M. Das", nextAction: "Schedule initial consultation", dueDate: "2026-11-22", lastActivityAt: "2026-11-16T10:00:00Z", priority: "medium" },
  { id: "CL-1010", patientReference: "CL-P-1010", status: "in_care", assignedCareWorker: null, nextAction: "Assign follow-up owner", dueDate: "2026-11-12", lastActivityAt: "2026-11-07T13:30:00Z", priority: "critical" },
  { id: "CL-1011", patientReference: "CL-P-1011", status: "completed", assignedCareWorker: "A. Sharma", nextAction: "Archive verified record", dueDate: "2026-11-10", lastActivityAt: "2026-11-10T15:10:00Z", priority: "low" },
  { id: "CL-1012", patientReference: "CL-P-1012", status: "appointment_scheduled", assignedCareWorker: "R. Kumar", nextAction: "Send appointment reminder", dueDate: "2026-11-18", lastActivityAt: "2026-11-16T17:00:00Z", priority: "medium" },
];

export const demoEscalations: EscalationRecord[] = [
  { id: "ESC-201", caseId: "CL-1006", patientReference: "CL-P-1006", type: "overdue_referral", reason: "Referral has not been acknowledged by the receiving centre.", responsiblePerson: "R. Kumar", createdAt: "2026-11-10T09:00:00Z", overdueDays: 8, priority: "critical" },
  { id: "ESC-202", caseId: "CL-1004", patientReference: "CL-P-1004", type: "missed_appointment", reason: "Scheduled consultation was missed and no new date is recorded.", responsiblePerson: "M. Das", createdAt: "2026-11-15T09:00:00Z", overdueDays: 3, priority: "high" },
  { id: "ESC-203", caseId: "CL-1008", patientReference: "CL-P-1008", type: "unacknowledged_notification", reason: "Referral notification remains unacknowledged.", responsiblePerson: "S. Iyer", createdAt: "2026-11-14T12:00:00Z", overdueDays: 2, priority: "high" },
  { id: "ESC-204", caseId: "CL-1010", patientReference: "CL-P-1010", type: "unassigned_case", reason: "No care worker is assigned to an active follow-up case.", responsiblePerson: null, createdAt: "2026-11-13T08:30:00Z", overdueDays: 5, priority: "critical" },
  { id: "ESC-205", caseId: "CL-1002", patientReference: "CL-P-1002", type: "unresolved_case", reason: "Referral is pending beyond its target date.", responsiblePerson: "R. Kumar", createdAt: "2026-11-16T08:00:00Z", overdueDays: 2, priority: "medium" },
];

export const demoAtRiskCases: AtRiskCase[] = [
  { caseId: "CL-1006", patientReference: "CL-P-1006", reasons: ["pending_referral", "no_recent_follow_up"], overdueDays: 8, lastActivityAt: "2026-11-08T10:10:00Z", suggestedNextAction: "Call the referral centre and record the outcome.", assignedCareWorker: "R. Kumar", riskLevel: "critical" },
  { caseId: "CL-1004", patientReference: "CL-P-1004", reasons: ["missed_appointment", "no_recent_follow_up"], overdueDays: 3, lastActivityAt: "2026-11-10T08:00:00Z", suggestedNextAction: "Contact the patient and reschedule the consultation.", assignedCareWorker: "M. Das", riskLevel: "high" },
  { caseId: "CL-1008", patientReference: "CL-P-1008", reasons: ["overdue_acknowledgement", "pending_referral"], overdueDays: 2, lastActivityAt: "2026-11-11T09:45:00Z", suggestedNextAction: "Confirm that the receiving centre received the referral.", assignedCareWorker: "S. Iyer", riskLevel: "high" },
  { caseId: "CL-1010", patientReference: "CL-P-1010", reasons: ["no_recent_follow_up"], overdueDays: 5, lastActivityAt: "2026-11-07T13:30:00Z", suggestedNextAction: "Assign an owner and schedule the next follow-up.", assignedCareWorker: null, riskLevel: "critical" },
];

export const demoAnalytics: AdminAnalytics = {
  referralCompletionRate: 78.4,
  appointmentAttendanceRate: 86.2,
  notificationAcknowledgementRate: 91.7,
  averageTimeToConsultationHours: 42.6,
  verifiedClosureRate: 73.9,
  unresolvedCases: 64,
  referralCompletionTrend: [
    { date: "Nov 11", value: 18 },
    { date: "Nov 12", value: 22 },
    { date: "Nov 13", value: 20 },
    { date: "Nov 14", value: 27 },
    { date: "Nov 15", value: 25 },
    { date: "Nov 16", value: 31 },
    { date: "Nov 17", value: 34 },
  ],
  appointmentAttendanceTrend: [
    { date: "Nov 11", value: 24 },
    { date: "Nov 12", value: 26 },
    { date: "Nov 13", value: 23 },
    { date: "Nov 14", value: 29 },
    { date: "Nov 15", value: 28 },
    { date: "Nov 16", value: 33 },
    { date: "Nov 17", value: 36 },
  ],
};
