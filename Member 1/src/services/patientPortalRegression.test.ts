import { describe, expect, it } from "vitest";
import { isConnectedPatientToken } from "./appointmentService";
import { mapConnectedNotification } from "./notificationService";

describe("connected patient portal identity", () => {
  it("recognizes the seeded patient's token instead of only the legacy role string", () => {
    expect(isConnectedPatientToken("usr-pt-1001")).toBe(true);
    expect(isConnectedPatientToken("patient")).toBe(true);
    expect(isConnectedPatientToken("usr-cw-1")).toBe(false);
    expect(isConnectedPatientToken(null)).toBe(false);
  });

  it("retains acknowledged time so the patient UI cannot offer a second acknowledgement", () => {
    const item = {
      id: "notif-1001", caseId: "CL-1001", title: "Reviewed",
      message: "Patient has acknowledged the update.", status: "acknowledged",
      createdAt: "2026-11-19T10:00:00Z", acknowledgedAt: "2026-11-19T11:00:00Z",
    };
    const mapped = mapConnectedNotification(item, "patient", "CL-P-1001");
    expect(mapped.unread).toBe(false);
    expect(mapped.acknowledgedAt).toBe("2026-11-19T11:00:00Z");
    expect(Boolean(mapped.acknowledgedAt)).toBe(true);
  });

  it("retains patient identity so the notification acknowledgement button can work", () => {
    const item = { id: "notif-1001", caseId: "CL-1001", title: "Care summary",
      message: "Please review", status: "delivered", createdAt: "2026-11-19T10:00:00Z" };
    const patientView = mapConnectedNotification(item, "patient", "CL-P-1001");
    expect(patientView.patientId).toBe("CL-P-1001");
    expect(patientView.caseId).toBe("CL-1001");
    expect(patientView.unread).toBe(true);
    expect(mapConnectedNotification(item, "doctor").patientId).toBeUndefined();
  });
});
