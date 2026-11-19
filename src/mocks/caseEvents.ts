import type { CaseTimelineEvent } from "../types";
import { patients } from "./data";

export const demoCaseEvents: CaseTimelineEvent[] = [
  { id: "EV-2048-01", caseId: "CASE-2048", patientId: "CL-2048", eventType: "screening_recorded", description: "Mammogram screening record SR-5812 recorded.", actorName: "Bayview Radiology", actorRole: "Care team", createdAt: "2026-11-15T09:12:00-08:00" },
  { id: "EV-2048-02", caseId: "CASE-2048", patientId: "CL-2048", eventType: "case_created", description: "A case was created to track the abnormal screening result.", actorName: "CARELOOP", actorRole: "System", createdAt: "2026-11-15T09:12:30-08:00" },
  { id: "EV-2048-03", caseId: "CASE-2048", patientId: "CL-2048", eventType: "case_assigned", description: "Dr. Maya Chen and Jordan Lee were assigned to the care team.", actorName: "CARELOOP", actorRole: "System", createdAt: "2026-11-15T09:46:00-08:00" },
  { id: "EV-2048-04", caseId: "CASE-2048", patientId: "CL-2048", eventType: "clinical_review", description: "The assigned clinician reviewed the screening report and documented follow-up.", actorName: "Dr. Maya Chen", actorRole: "Doctor", createdAt: "2026-11-15T09:46:00-08:00" },
  { id: "EV-2048-05", caseId: "CASE-2048", patientId: "CL-2048", eventType: "notification_sent", description: "An in-app care update was made available to the patient.", actorName: "CARELOOP", actorRole: "System", createdAt: "2026-11-15T10:03:00-08:00" },
  { id: "EV-2048-06", caseId: "CASE-2048", patientId: "CL-2048", eventType: "referral_updated", description: "A breast imaging referral is recorded as scheduled at Bayview Imaging Center.", actorName: "Jordan Lee", actorRole: "Care coordinator", createdAt: "2026-11-15T10:11:00-08:00" },
  { id: "EV-2048-07", caseId: "CASE-2048", patientId: "CL-2048", eventType: "appointment_recorded", description: "Diagnostic ultrasound scheduled for Nov 17, 2026 at 2:30 PM.", actorName: "Jordan Lee", actorRole: "Care coordinator", createdAt: "2026-11-15T10:16:00-08:00" },
  { id: "EV-2048-08", caseId: "CASE-2048", patientId: "CL-2048", eventType: "followup_recorded", description: "A follow-up task to confirm diagnostic imaging is due Nov 17, 2026 at 1:00 PM.", actorName: "Jordan Lee", actorRole: "Care coordinator", createdAt: "2026-11-15T10:18:00-08:00" },
];

let nextEventNumber = 1;

export function appendDemoCaseEvent(event: Omit<CaseTimelineEvent, "id">): CaseTimelineEvent {
  const created: CaseTimelineEvent = {
    ...event,
    id: `EV-${Date.now()}-${nextEventNumber++}`,
  };
  demoCaseEvents.push(created);
  return created;
}

export function recordDemoCaseEvent(
  patientId: string | undefined,
  patientName: string,
  eventType: string,
  description: string,
  actorName: string,
  actorRole: string,
): CaseTimelineEvent | undefined {
  const patient = patients.find((item) => item.id === patientId || item.name === patientName);
  if (!patient?.caseId) return undefined;
  return appendDemoCaseEvent({
    caseId: patient.caseId,
    patientId: patient.id,
    eventType,
    description,
    actorName,
    actorRole,
    createdAt: new Date().toISOString(),
  });
}
