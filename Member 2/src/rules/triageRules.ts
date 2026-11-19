import type { Priority } from "../types/admin";
import type { ScreeningUrgency } from "../types/domain";

export interface TriageEvaluation {
  priority: Priority;
  urgency: ScreeningUrgency;
  dueAt: string; // ISO string
  nextAction: string;
  requiresClinicalReview: boolean;
  ruleExplanation: string;
}

/**
 * Deterministic triage rule engine for screening results.
 *
 * Rules are deterministic, transparent, and do not make automated medical diagnoses.
 * Ambiguous, urgent, or critical findings are strictly routed to qualified human clinical review.
 */
export function evaluateScreeningTriage(
  screeningType: string,
  resultValue: string,
  explicitUrgency?: ScreeningUrgency,
  score?: number,
  now: Date = new Date()
): TriageEvaluation {
  const resultLower = resultValue.toLowerCase();
  const typeLower = screeningType.toLowerCase();

  let priority: Priority = "low";
  let urgency: ScreeningUrgency = explicitUrgency ?? "routine";
  let slaHours = 336; // 14 days default
  let nextAction = "Routine screening result review and patient communication";
  let requiresClinicalReview = false;
  let ruleExplanation = "Routine result flagged for standard communication";

  // Check critical thresholds
  const isCriticalCondition =
    urgency === "critical" ||
    resultLower.includes("crisis") ||
    resultLower.includes("severe") ||
    resultLower.includes("malignant") ||
    resultLower.includes("pdr") ||
    resultLower.includes("acute") ||
    (typeLower.includes("cardio") && score && score >= 180) ||
    (typeLower.includes("retinopathy") && score && score >= 3);

  // Check ambiguous / inconclusive / ungradable findings requiring qualified clinical review
  const isAmbiguousCondition =
    resultLower.includes("ambiguous") ||
    resultLower.includes("inconclusive") ||
    resultLower.includes("ungradable") ||
    resultLower.includes("uninterpretable") ||
    resultLower.includes("inadequate") ||
    resultLower.includes("indeterminate");

  if (isCriticalCondition) {
    priority = "critical";
    urgency = "critical";
    slaHours = 24; // 24 hours SLA
    nextAction = "Urgent clinical review and specialist consultation";
    requiresClinicalReview = true;
    ruleExplanation = "Critical threshold reached: 24h SLA and required clinician consultation";
  } else if (isAmbiguousCondition) {
    priority = "high";
    urgency = "urgent";
    slaHours = 72; // 72 hours SLA
    nextAction = "Qualified human clinical review of ambiguous or inconclusive screening result";
    requiresClinicalReview = true;
    ruleExplanation = "Ambiguous/inconclusive finding: mandatory routing to qualified human clinician review";
  } else {
    // Check urgent / high risk thresholds
    const isUrgentCondition =
      urgency === "urgent" ||
      resultLower.includes("stage 2") ||
      resultLower.includes("moderate") ||
      resultLower.includes("positive") ||
      resultLower.includes("edema") ||
      resultLower.includes("atypical") ||
      (typeLower.includes("cardio") && score && score >= 140) ||
      (typeLower.includes("retinopathy") && score && score >= 2);

    if (isUrgentCondition) {
      priority = "high";
      urgency = "urgent";
      slaHours = 72; // 72 hours SLA (3 days)
      nextAction = "Specialist referral and diagnostic confirmation";
      requiresClinicalReview = true;
      ruleExplanation = "Urgent / Stage 2 threshold reached: 72h SLA for specialist referral";
    } else {
      // Check medium / borderline thresholds
      const isMediumCondition =
        resultLower.includes("stage 1") ||
        resultLower.includes("elevated") ||
        resultLower.includes("borderline") ||
        resultLower.includes("mild") ||
        (typeLower.includes("cardio") && score && score >= 130);

      if (isMediumCondition) {
        priority = "medium";
        urgency = "routine";
        slaHours = 168; // 7 days SLA
        nextAction = "Review screening result and schedule initial consultation";
        requiresClinicalReview = false;
        ruleExplanation = "Elevated / borderline threshold reached: 7-day SLA for care worker intake";
      }
    }
  }

  const dueDate = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
  const dueAt = dueDate.toISOString().slice(0, 10); // YYYY-MM-DD

  return {
    priority,
    urgency,
    dueAt,
    nextAction,
    requiresClinicalReview,
    ruleExplanation,
  };
}
