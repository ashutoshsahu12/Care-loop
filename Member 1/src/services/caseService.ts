import { api, isDemoMode } from "./api";
import { demoCaseEvents, appendDemoCaseEvent } from "../mocks/caseEvents";
import { DEMO_PATIENT_ID, appointments, followUps, notifications, patients, screenings } from "../mocks/data";
import { demoReferrals } from "./referralService";
import type { CaseTimelineEvent, PatientCase } from "../types";
import { BACKEND_DEMO_PATIENT_REF, getCaseDetails, getPatientSummary, toEvent, toPatientCase } from "./backendBridge";

function getDemoCase(patientId?: string): PatientCase | undefined {
  if (patientId !== DEMO_PATIENT_ID) return undefined;
  const patient = patients.find((item) => item.id === patientId);
  const screening = screenings.find((item) => item.patientId === patientId);
  if (!patient || !screening || !patient.caseId) return undefined;
  return {
    caseId: patient.caseId,
    patientId: patient.id,
    patientReference: patient.id,
    status: patient.status,
    priority: patient.priority,
    priorityReason: patient.priorityReason || "Priority reason not provided.",
    assignedTo: patient.doctor,
    careCoordinator: patient.coordinator,
    nextAction: patient.nextAction,
    dueAt: patient.dueAt || "",
    screening,
    referrals: demoReferrals.filter((item) => item.patientId === patientId || item.patient === patient.name),
    appointments: appointments.filter((item) => item.patientId === patientId || item.patient === patient.name),
    followups: followUps.filter((item) => item.patientId === patientId || item.patient === patient.name),
  };
}

function requireDemoPatientCase(caseId: string, patientId: string): PatientCase {
  const patientCase = getDemoCase(patientId);
  if (!patientCase || patientCase.caseId !== caseId) {
    throw new Error("This case is not available to the signed-in patient.");
  }
  return patientCase;
}

export const caseService = {
  async getMyCase(patientId?: string): Promise<PatientCase | undefined> {
    if (!isDemoMode) {
      const summary = await getPatientSummary(patientId || BACKEND_DEMO_PATIENT_REF);
      if (!summary.activeCase) return undefined;
      return toPatientCase(await getCaseDetails(summary.activeCase.id));
    }
    return getDemoCase(patientId);
  },

  async getTimeline(caseId: string, patientId?: string): Promise<CaseTimelineEvent[]> {
    if (!isDemoMode) {
      const events = (await api.get<import("./backendBridge").BackendEvent[]>(`/cases/${encodeURIComponent(caseId)}/timeline`)).data;
      return events.map(event => toEvent(event, patientId || BACKEND_DEMO_PATIENT_REF));
    }
    requireDemoPatientCase(caseId, patientId || "");
    return demoCaseEvents
      .filter((event) => event.caseId === caseId && event.patientId === patientId)
      .slice()
      .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
  },

  async acknowledge(caseId: string, patientId: string, notificationId?: number | string): Promise<void> {
    if (!isDemoMode) {
      const summary = await getPatientSummary(patientId);
      const notification = summary.unreadNotifications.find(item => item.caseId === caseId && item.status !== "acknowledged" &&
        (notificationId === undefined || item.id === notificationId));
      if (!notification) throw new Error("No pending notification exists for this care case.");
      await api.post(`/notifications/${encodeURIComponent(notification.id)}/acknowledge`, {});
      return;
    }
    requireDemoPatientCase(caseId, patientId);
    const notification = notifications.find((item) => item.caseId === caseId && item.patientId === patientId &&
      (notificationId === undefined || item.id === notificationId));
    if (!notification) throw new Error("There is no notification to acknowledge for this case.");
    if (notification.acknowledgedAt) throw new Error("This care update has already been acknowledged.");

    const acknowledgedAt = new Date().toISOString();
    notification.acknowledgedAt = acknowledgedAt;
    notification.unread = false;
    appendDemoCaseEvent({
      caseId,
      patientId,
      eventType: "patient_acknowledged",
      description: "The patient acknowledged the in-app care update.",
      actorName: patients.find((item) => item.id === patientId)?.name || "Patient",
      actorRole: "Patient",
      createdAt: acknowledgedAt,
    });
  },

  async requestHelp(caseId: string, patientId: string, message: string): Promise<void> {
    const description = message.trim();
    if (description.length < 8) throw new Error("Add a short message so your care team knows how to help.");
    if (!isDemoMode) {
      await api.post(`/cases/${encodeURIComponent(caseId)}/help-requests`, { message: description });
      return;
    }
    requireDemoPatientCase(caseId, patientId);
    const patient = patients.find((item) => item.id === patientId);
    if (!patient) throw new Error("Your patient profile could not be found.");
    const createdAt = new Date().toISOString();
    appendDemoCaseEvent({
      caseId,
      patientId,
      eventType: "help_requested",
      description: "The patient sent a help request to the care team.",
      actorName: patient.name,
      actorRole: "Patient",
      createdAt,
    });
    notifications.unshift({
      id: `NT-${Date.now()}`,
      caseId,
      title: "Patient requested help",
      description: `${patient.name} sent a message about case ${patient.id}.`,
      time: createdAt,
      createdAt,
      unread: true,
      tone: "amber",
    });
  },
};
