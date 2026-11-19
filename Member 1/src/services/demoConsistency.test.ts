import { describe, expect, it } from "vitest";
import { displayStatus, toReferral, toScreening, visibleCaseDetails, type BackendCaseDetail } from "./backendBridge";
import { extractDemoScreeningScore } from "./screeningService";

const example: BackendCaseDetail = {
  caseRecord: { id: "CL-1001", patientId: "pat-1001", status: "in_care",
    priority: "high", ownerId: "usr-cw-1", assignedCareWorkerName: "A. Sharma",
    nextAction: "Clinical follow-up", dueAt: "2026-12-01", lastActivityAt: "2026-11-19" },
  patient: { id: "pat-1001", patientReference: "CL-P-1001", name: "Kavita Sundaram" },
  screeningResult: { id: "screen-1", screeningType: "blood pressure", resultValue: "inconclusive",
    status: "pending_review", createdAt: "2026-11-19", submittedById: "usr-clin-1" },
  referrals: [{ id: "ref-1", status: "rejected", specialty: "Cardiology",
    targetFacility: "Demo Clinic", createdAt: "2026-11-19", referringProviderId: "usr-clin-1" }],
  appointments: [], tasks: [], timeline: [],
};

describe("connected demo display and scoping", () => {
  it("does not mark active care as clinically resolved", () => {
    expect(displayStatus("in_care")).toBe("In care");
    expect(displayStatus("completed")).toBe("Closed");
  });
  it("keeps unknown/inconclusive screening results in review", () => {
    expect(toScreening(example)?.status).toBe("Pending review");
    expect(toReferral(example, example.referrals[0]).status).toBe("Rejected");
  });
  it("shows only assigned worker and involved clinician case records", () => {
    const other = { ...example, caseRecord: { ...example.caseRecord, id: "CL-1002", ownerId: "usr-cw-2" },
      screeningResult: { ...example.screeningResult!, submittedById: "usr-cw-2" },
      referrals: [], timeline: [] };
    expect(visibleCaseDetails([example, other], "worker").map(d => d.caseRecord.id)).toEqual(["CL-1001"]);
    expect(visibleCaseDetails([example, other], "doctor").map(d => d.caseRecord.id)).toEqual(["CL-1001"]);
    expect(visibleCaseDetails([example, other], "patient", "CL-P-1001")).toHaveLength(2);
  });
  it("extracts BP systolic values only for BP/cardiovascular screenings", () => {
    expect(extractDemoScreeningScore("Cardiovascular / blood pressure", "BP 150/95")).toBe(150);
    expect(extractDemoScreeningScore("Mammogram", "BI-RADS 4, 150/95")).toBeUndefined();
    expect(extractDemoScreeningScore("Blood pressure", "inconclusive")).toBeUndefined();
  });
});
