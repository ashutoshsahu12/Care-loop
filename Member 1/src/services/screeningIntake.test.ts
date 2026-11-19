import { describe, expect, it } from "vitest";
import { latestVisibleCases, unscreenedRegistrations, type BackendCaseDetail } from "./backendBridge";

function caseFor(id: string, createdAt: string, ownerId: string): BackendCaseDetail {
  return {
    caseRecord: { id, patientId: "pat-1001", ownerId, createdAt,
      assignedCareWorkerName: "A. Sharma", status: "in_care", priority: "low",
      nextAction: "Review", dueAt: "2026-12-01", lastActivityAt: createdAt },
    patient: { id: "pat-1001", patientReference: "CL-P-1001", name: "Kavita Sundaram" },
    screeningResult: null, referrals: [], appointments: [], tasks: [], timeline: [],
  };
}

describe("case selection and screening intake", () => {
  it("picks the latest *visible* assigned case, not the globally latest inaccessible one", () => {
    const oldAssigned = caseFor("CL-OLD", "2026-11-10", "usr-cw-1");
    const recentOther = caseFor("CL-NEW", "2026-11-18", "usr-cw-2");
    expect(latestVisibleCases([recentOther, oldAssigned], "worker").map(d => d.caseRecord.id))
      .toEqual(["CL-OLD"]);
    expect(latestVisibleCases([oldAssigned, recentOther], "admin").map(d => d.caseRecord.id))
      .toEqual(["CL-NEW"]);
  });

  it("only offers unscreened registrations in the intake queue", () => {
    const existing = caseFor("CL-OLD", "2026-11-10", "usr-cw-2");
    const registered = [
      existing.patient,
      { id: "pat-new", patientReference: "CL-P-NEW", name: "New Patient" },
    ];
    expect(unscreenedRegistrations(registered, [existing]).map(p => p.id))
      .toEqual(["CL-P-NEW"]);
  });
});
