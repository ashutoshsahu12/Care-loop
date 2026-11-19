import type { Priority } from "../types/admin";
import type { EscalationRecord, AtRiskCase, FollowUpRiskReason } from "../types/admin";

export interface CaseEscalationCheckInput {
  caseId: string;
  patientReference: string;
  status: string;
  priority: Priority;
  assignedCareWorker: string | null;
  dueAt: string;
  lastActivityAt: string;
  referrals: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  appointments: Array<{
    id: string;
    status: string;
    scheduledTime: string;
    updatedAt: string;
  }>;
  notifications: Array<{
    id: string;
    status: string;
    createdAt: string;
    acknowledgedAt?: string | null;
  }>;
}

export function detectCaseEscalations(
  input: CaseEscalationCheckInput,
  now: Date = new Date()
): {
  escalations: EscalationRecord[];
  atRisk: AtRiskCase | null;
} {
  const escalations: EscalationRecord[] = [];
  const riskReasons: FollowUpRiskReason[] = [];
  const nowMs = now.getTime();

  // If completed, no escalations
  if (input.status === "completed") {
    return { escalations: [], atRisk: null };
  }

  const dueDateMs = new Date(input.dueAt).getTime();
  const lastActivityMs = new Date(input.lastActivityAt).getTime();
  const overdueDays = Math.max(0, Math.floor((nowMs - dueDateMs) / (1000 * 60 * 60 * 24)));
  const daysSinceActivity = Math.floor((nowMs - lastActivityMs) / (1000 * 60 * 60 * 24));

  // 1. Unassigned case (> 24h)
  if (!input.assignedCareWorker || input.status === "unassigned") {
    const caseAgeDays = Math.max(1, Math.floor((nowMs - lastActivityMs) / (1000 * 60 * 60 * 24)));
    escalations.push({
      id: `ESC-UNASG-${input.caseId}`,
      caseId: input.caseId,
      patientReference: input.patientReference,
      type: "unassigned_case",
      reason: "No care worker is assigned to an active follow-up case.",
      responsiblePerson: null,
      createdAt: input.lastActivityAt,
      overdueDays: Math.max(1, caseAgeDays),
      priority: input.priority === "critical" ? "critical" : "high",
    });
  }

  // 2. Overdue referral (pending_acceptance for >= 3 days or case overdue)
  const pendingReferrals = input.referrals.filter((r) => r.status === "pending_acceptance");
  if (pendingReferrals.length > 0) {
    riskReasons.push("pending_referral");
    for (const ref of pendingReferrals) {
      const refCreatedMs = new Date(ref.createdAt).getTime();
      const refDays = Math.floor((nowMs - refCreatedMs) / (1000 * 60 * 60 * 24));
      if (refDays >= 3 || overdueDays > 0) {
        escalations.push({
          id: `ESC-REF-${ref.id}`,
          caseId: input.caseId,
          patientReference: input.patientReference,
          type: "overdue_referral",
          reason: "Referral has not been acknowledged by the receiving centre.",
          responsiblePerson: input.assignedCareWorker,
          createdAt: ref.createdAt,
          overdueDays: Math.max(refDays, overdueDays),
          priority: input.priority,
        });
      }
    }
  }

  // 3. Missed appointment (latest appointment is no_show with no subsequent scheduled)
  const latestApt = input.appointments[input.appointments.length - 1];
  const hasFutureScheduled = input.appointments.some(
    (a) => a.status === "scheduled" && new Date(a.scheduledTime).getTime() > nowMs
  );

  if (latestApt && latestApt.status === "no_show" && !hasFutureScheduled) {
    riskReasons.push("missed_appointment");
    const aptRecordedMs = new Date(latestApt.updatedAt).getTime();
    const missedDays = Math.max(1, Math.floor((nowMs - aptRecordedMs) / (1000 * 60 * 60 * 24)));
    escalations.push({
      id: `ESC-APT-${latestApt.id}`,
      caseId: input.caseId,
      patientReference: input.patientReference,
      type: "missed_appointment",
      reason: "Scheduled consultation was missed and no new date is recorded.",
      responsiblePerson: input.assignedCareWorker,
      createdAt: latestApt.updatedAt,
      overdueDays: missedDays,
      priority: input.priority === "critical" ? "critical" : "high",
    });
  }

  // 4. Unacknowledged notification (> 48 hours)
  const unacknowledged = input.notifications.filter(
    (n) => n.status !== "acknowledged" && nowMs - new Date(n.createdAt).getTime() > 48 * 60 * 60 * 1000
  );
  if (unacknowledged.length > 0) {
    riskReasons.push("overdue_acknowledgement");
    for (const notif of unacknowledged) {
      const notifDays = Math.floor((nowMs - new Date(notif.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      escalations.push({
        id: `ESC-NOTIF-${notif.id}`,
        caseId: input.caseId,
        patientReference: input.patientReference,
        type: "unacknowledged_notification",
        reason: "Referral notification remains unacknowledged.",
        responsiblePerson: input.assignedCareWorker,
        createdAt: notif.createdAt,
        overdueDays: notifDays,
        priority: input.priority,
      });
    }
  }

  // 5. Unresolved case past due
  if (overdueDays > 0 && input.status !== "completed") {
    // Avoid duplicate if an escalation already exists for the case
    const alreadyHasOverdue = escalations.some((e) => e.type === "unresolved_case");
    if (!alreadyHasOverdue) {
      escalations.push({
        id: `ESC-DUE-${input.caseId}`,
        caseId: input.caseId,
        patientReference: input.patientReference,
        type: "unresolved_case",
        reason: "Case has exceeded its target care completion due date.",
        responsiblePerson: input.assignedCareWorker,
        createdAt: input.dueAt,
        overdueDays,
        priority: input.priority,
      });
    }
  }

  // Check no recent follow up
  if (daysSinceActivity >= 5) {
    riskReasons.push("no_recent_follow_up");
  }

  let atRisk: AtRiskCase | null = null;
  if (riskReasons.length > 0 || overdueDays > 0) {
    let suggestedAction = "Review case record and contact patient.";
    if (riskReasons.includes("pending_referral")) {
      suggestedAction = "Call the referral centre and record the outcome.";
    } else if (riskReasons.includes("missed_appointment")) {
      suggestedAction = "Contact the patient and reschedule the consultation.";
    } else if (riskReasons.includes("overdue_acknowledgement")) {
      suggestedAction = "Confirm that the receiving centre received the referral.";
    } else if (!input.assignedCareWorker) {
      suggestedAction = "Assign an owner and schedule the next follow-up.";
    }

    atRisk = {
      caseId: input.caseId,
      patientReference: input.patientReference,
      reasons: Array.from(new Set(riskReasons)),
      overdueDays,
      lastActivityAt: input.lastActivityAt,
      suggestedNextAction: suggestedAction,
      assignedCareWorker: input.assignedCareWorker,
      riskLevel: input.priority,
    };
  }

  return { escalations, atRisk };
}
