import type { CaseStatus } from "../types/admin";
import type { UserRole } from "../types/auth";

export interface StatusTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Valid allowed transitions in the CARELOOP care coordination state machine.
 *
 * NOTE: Transition directly to 'completed' is strictly forbidden via standard status update;
 * it MUST occur exclusively through the verified case closure workflow with clinician verification.
 */
const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  unassigned: ["screening", "referred"],
  screening: ["referred", "appointment_scheduled", "in_care", "overdue", "unassigned"],
  referred: ["appointment_scheduled", "in_care", "overdue", "screening", "unassigned"],
  appointment_scheduled: ["in_care", "overdue", "screening", "referred"],
  in_care: ["overdue", "screening", "referred", "appointment_scheduled"],
  overdue: ["screening", "referred", "appointment_scheduled", "in_care"],
  completed: [], // Closed cases cannot transition directly without clinical reopening
};

export function canTransitionStatus(
  currentStatus: CaseStatus,
  targetStatus: CaseStatus,
  actorRole: UserRole,
  isVerifiedClosure: boolean = false
): StatusTransitionResult {
  if (currentStatus === targetStatus) {
    return { allowed: true };
  }

  // Completing a case requires verified closure workflow
  if (targetStatus === "completed") {
    if (!isVerifiedClosure) {
      return {
        allowed: false,
        reason:
          "Cases cannot be directly moved to 'completed' via standard status update. Complete care must be recorded through the verified case closure workflow with an authorized clinician.",
      };
    }
    if (actorRole !== "clinician" && actorRole !== "admin") {
      return {
        allowed: false,
        reason: "Only a clinician or admin can verify and execute case closure.",
      };
    }
    return { allowed: true };
  }

  // Reopening a completed case requires admin or clinician
  if (currentStatus === "completed") {
    if (actorRole !== "clinician" && actorRole !== "admin") {
      return {
        allowed: false,
        reason: "Reopening a completed case requires clinician or admin authorization.",
      };
    }
    return { allowed: true };
  }

  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${allowedTargets.join(", ")}.`,
    };
  }

  return { allowed: true };
}
