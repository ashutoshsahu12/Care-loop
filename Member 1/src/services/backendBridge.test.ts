import { describe, expect, it } from "vitest";
import { backendStatus, displayPriority, displayStatus, toPatient, toPatientCase, type BackendCaseDetail } from "./backendBridge";

const example: BackendCaseDetail = {
  caseRecord: { id: "CL-1001", patientId: "pat-1001", status: "appointment_scheduled",
    priority: "high", assignedCareWorkerName: "A. Sharma", nextAction: "Attend appointment",
    dueAt: "2026-11-30", lastActivityAt: "2026-11-18T09:00:00Z" },
  patient: { id: "pat-1001", patientReference: "CL-P-1001",
    name: "Kavita Sundaram", dateOfBirth: "1978-04-12", gender: "female" },
  screeningResult: { id: "scr-1001", screeningType: "blood pressure",
    resultValue: "142/92", createdAt: "2026-11-18T08:00:00Z", status: "escalated" },
  referrals: [{ id: "ref-1", specialty: "cardiology", targetFacility: "Clinic",
    createdAt: "2026-11-18T10:00:00Z", status: "accepted" }],
  appointments: [{ id: "apt-1", scheduledTime: "2026-11-30T09:00:00Z",
    providerName: "Doctor", facility: "Clinic", status: "scheduled" }],
  tasks: [], timeline: [],
};
describe("Member 2 to Member 1 adapters", () => {
  it("maps backend statuses and priorities to UI labels", () => {
    expect(displayStatus("appointment_scheduled")).toBe("Appointment scheduled");
    expect(displayStatus("completed")).toBe("Closed");
    expect(backendStatus("Resolved")).toBe("in_care");
    expect(displayPriority("critical")).toBe("High");
  });
  it("uses canonical case/patient IDs and preserves referral/appointment links", () => {
    const patient = toPatient(example);
    const careCase = toPatientCase(example);
    expect(patient.id).toBe("CL-P-1001");
    expect(patient.caseId).toBe("CL-1001");
    expect(careCase.patientId).toBe("CL-P-1001");
    expect(careCase.referrals[0].id).toBe("ref-1");
    expect(careCase.appointments[0].id).toBe("apt-1");
  });
});
