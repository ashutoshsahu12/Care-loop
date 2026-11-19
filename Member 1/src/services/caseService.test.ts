import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { demoCaseEvents } from "../mocks/caseEvents";
import { notifications } from "../mocks/data";
import type { CareNotification, CaseTimelineEvent } from "../types";
import { appointmentService } from "./appointmentService";
import { caseService } from "./caseService";
import { followupService } from "./followupService";
import { notificationService } from "./notificationService";
import { referralService } from "./referralService";
import { screeningService } from "./screeningService";

describe("patient case data", () => {
  let savedEvents: CaseTimelineEvent[];
  let savedNotifications: CareNotification[];

  beforeEach(() => {
    savedEvents = demoCaseEvents.map((event) => ({ ...event }));
    savedNotifications = notifications.map((notification) => ({ ...notification }));
  });

  afterEach(() => {
    demoCaseEvents.splice(0, demoCaseEvents.length, ...savedEvents);
    notifications.splice(0, notifications.length, ...savedNotifications);
  });

  it("returns only the case linked to the requested demo patient", async () => {
    const patientCase = await caseService.getMyCase("CL-2048");
    expect(patientCase?.caseId).toBe("CASE-2048");
    expect(patientCase).not.toHaveProperty("clinicalNotes");
    expect(await caseService.getMyCase("CL-2047")).toBeUndefined();
  });

  it("scopes patient records and notifications to the linked patient", async () => {
    const patientId = "CL-2048";
    const otherPatientId = "CL-2047";
    const patientRecords = await Promise.all([
      screeningService.list("patient", patientId),
      appointmentService.list("patient", patientId),
      followupService.list("patient", patientId),
      referralService.list("patient", patientId),
      notificationService.list("patient", patientId),
    ]);

    expect(patientRecords.flat().every((record) => {
      if ("patientId" in record && record.patientId) return record.patientId === patientId;
      return "patient" in record && record.patient === "Olivia Rhye";
    })).toBe(true);
    expect(await Promise.all([
      screeningService.list("patient", otherPatientId),
      appointmentService.list("patient", otherPatientId),
      followupService.list("patient", otherPatientId),
      referralService.list("patient", otherPatientId),
      notificationService.list("patient", otherPatientId),
    ])).toEqual([[], [], [], [], []]);
  });

  it("renders a chronological event history without inventing acknowledgement or closure", async () => {
    const events = await caseService.getTimeline("CASE-2048", "CL-2048");
    const timestamps = events.map((event) => Date.parse(event.createdAt));
    expect(timestamps).toEqual([...timestamps].sort((left, right) => left - right));
    expect(events.some((event) => event.eventType === "patient_acknowledged")).toBe(false);
    expect(events.some((event) => event.eventType === "case_verified_closed")).toBe(false);
  });

  it("records one patient acknowledgment and rejects duplicate or cross-case actions", async () => {
    await caseService.acknowledge("CASE-2048", "CL-2048");
    expect(demoCaseEvents.at(-1)?.eventType).toBe("patient_acknowledged");
    expect(notifications.find((notification) => notification.caseId === "CASE-2048")?.acknowledgedAt).toBeTruthy();
    await expect(caseService.acknowledge("CASE-2048", "CL-2048")).rejects.toThrow("already been acknowledged");
    await expect(caseService.acknowledge("CASE-2048", "CL-2047")).rejects.toThrow("not available");
    expect(demoCaseEvents.filter((item) => item.eventType === "patient_acknowledged")).toHaveLength(1);
  });

  it("keeps help requests in the in-app case history and validates the message", async () => {
    await expect(caseService.requestHelp("CASE-2048", "CL-2048", "Help")).rejects.toThrow("short message");
    await caseService.requestHelp("CASE-2048", "CL-2048", "Please call me about my appointment.");
    expect(demoCaseEvents.at(-1)?.eventType).toBe("help_requested");
    expect(notifications[0].title).toBe("Patient requested help");
  });
});
