import type { UserRole } from "../types/auth";
import type { ClosureOutcome } from "../types/domain";

export interface ClosureValidationInput {
  actorRole: UserRole;
  actorId: string;
  outcome: ClosureOutcome;
  evidenceNote: string;
  caseStatus: string;
}

export interface ClosureValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Enforces safety and regulatory requirements for verified case closure:
 *
 * 1. Actor must be in an authorized clinical role ('clinician' or 'admin').
 * 2. Case must not already be closed.
 * 3. Documented outcome must be recorded.
 * 4. Evidence note must document verification (minimum 10 non-whitespace characters).
 * 5. Referral creation or appointment scheduling alone does NOT constitute closure without this verification.
 */
export function validateCaseClosure(input: ClosureValidationInput): ClosureValidationResult {
  if (input.caseStatus === "completed") {
    return {
      valid: false,
      reason: "Case is already verified and marked as completed.",
    };
  }

  if (input.actorRole !== "clinician" && input.actorRole !== "admin") {
    return {
      valid: false,
      reason: `Role '${input.actorRole}' is not authorized to close cases. Only a verified clinician or administrator can verify care loop closure.`,
    };
  }

  if (!input.outcome) {
    return {
      valid: false,
      reason: "A documented clinical outcome is required for closure.",
    };
  }

  const trimmedEvidence = input.evidenceNote ? input.evidenceNote.trim() : "";
  if (trimmedEvidence.length < 10) {
    return {
      valid: false,
      reason:
        "An evidence note of at least 10 characters is mandatory to document the verified clinical outcome.",
    };
  }

  return { valid: true };
}
