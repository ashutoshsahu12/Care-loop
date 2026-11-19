import { describe, expect, it } from "vitest";
import { toAppointment, toReferral, toFollowUp, type BackendCaseDetail } from "./backendBridge";

function detail(): BackendCaseDetail {
  return {
    caseRecord: {
      id: "CL-TEST", patientId: "pat-1001", ownerId: "usr-cw-1",
      assignedCareWorkerName: "A. Sharma", status: "in_care", priority: "low",
      nextAction: "Check appointment", dueAt: "2026-12-01",
      lastActivityAt: "2026-11-19", createdAt: "2026-11-19",
    },
    patient: { id: "pat-1001", patientReference: "CL-P-1001", name: "Demo Patient" },
    screeningResult: null, referrals: [], appointments: [], tasks: [], timeline: [],
  };
}

describe("canonical workflow presentation", () => {
  it("does not turn cancelled or rescheduled appointments into confirmations", () => {
    const d = detail();
    const appointment = { id: "apt-1", referralId: null, facility: "Clinic",
      scheduledTime: "2026-12-01T09:00:00Z", providerName: "Doctor", status: "cancelled" };
    expect(toAppointment(d, appointment).status).toBe("Cancelled");
    expect(toAppointment(d, { ...appointment, status: "rescheduled" }).status).toBe("Rescheduled");
    expect(toAppointment(d, { ...appointment, status: "scheduled" }).status).toBe("Confirmed");
  });

  it("shows task assignee rather than unrelated case owner and keeps cancelled tasks cancelled", () => {
    const d = detail();
    const task = { id: "task-1", title: "Call patient", dueDate: "2026-12-01",
      assignedToId: "usr-cw-2", status: "pending" };
    expect(toFollowUp(d, task).owner).toBe("R. Kumar");
    expect(toFollowUp(d, { ...task, status: "cancelled" }).status).toBe("Cancelled");
  });

  it("does not mark a referral scheduled because another referral has an appointment", () => {
    const d = detail();
    const referral = { id: "ref-1", specialty: "Cardiology", targetFacility: "Clinic",
      status: "accepted", createdAt: "2026-11-19" };
    d.appointments = [{ id: "apt-1", referralId: "ref-2", status: "scheduled",
      facility: "Clinic", scheduledTime: "2026-12-01T09:00:00Z", providerName: "Doctor" }];
    expect(toReferral(d, referral).status).toBe("Accepted");
    d.appointments[0].referralId = "ref-1";
    expect(toReferral(d, referral).status).toBe("Scheduled");
  });
});
