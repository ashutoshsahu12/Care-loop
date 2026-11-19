import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, followUps, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { FollowUp, Role } from "../types";
import { BACKEND_DEMO_PATIENT_REF, findDetailByPatientRef, getAllCaseDetails, getCaseDetails, toFollowUp } from "./backendBridge";
export const followupService = {
  async list(role?: Role, patientId?: string): Promise<FollowUp[]> {
    if (!isDemoMode) {
      const details = await getAllCaseDetails();
      return details.filter(d => role !== "patient" || d.patient.patientReference === (patientId || BACKEND_DEMO_PATIENT_REF))
        .flatMap(d => d.tasks.map(t => toFollowUp(d, t)));
    }
    if (role === "admin" || !role) return followUps;
    if (role === "patient") {
      if (patientId !== DEMO_PATIENT_ID) return [];
      const patient = patients.find((item) => item.id === patientId);
      return followUps.filter((followup) => followup.patientId === patientId || followup.patient === patient?.name);
    }
    const assignedPatients = new Set(patients.filter((patient) => role === "doctor" ? patient.doctor === "Dr. Maya Chen" : patient.coordinator === "Jordan Lee").map((patient) => patient.name));
    return followUps.filter((followup) => assignedPatients.has(followup.patient));
  },
  async create(payload: { patient: string; patientId?: string; reason: string; due: string; owner: string }): Promise<FollowUp> {
    if (!isDemoMode) {
      const detail = await findDetailByPatientRef(payload.patientId || "") ??
        (await getAllCaseDetails()).find(d => d.patient.name === payload.patient);
      if (!detail) throw new Error("Select an existing case before creating a follow-up.");
      const created = (await api.post<{ id: string }>(`/cases/${encodeURIComponent(detail.caseRecord.id)}/tasks`, {
        assignedToId: "usr-cw-1", title: payload.reason, dueDate: payload.due,
      })).data;
      const updated = await getCaseDetails(detail.caseRecord.id);
      const task = updated.tasks.find(t => t.id === created.id);
      if (!task) throw new Error("Follow-up was recorded but could not be retrieved.");
      return toFollowUp(updated, task);
    }
    const item: FollowUp = {
      id: `FU-${Date.now().toString().slice(-4)}`,
      patient: payload.patient,
      patientId: payload.patientId,
      initials: payload.patient.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      reason: payload.reason,
      due: payload.due,
      owner: payload.owner,
      status: "Upcoming",
    };
    followUps.unshift(item);
    recordDemoCaseEvent(payload.patientId, payload.patient, "followup_recorded", `Follow-up created: ${payload.reason}. Due ${payload.due}.`, payload.owner, "Care coordinator");
    return item;
  },
  async complete(id: string): Promise<FollowUp> {
    if (!isDemoMode) {
      await api.patch(`/tasks/${encodeURIComponent(id)}`, { status: "completed" });
      const detail = (await getAllCaseDetails()).find(d => d.tasks.some(t => t.id === id));
      if (!detail) throw new Error("Updated follow-up was not found.");
      return toFollowUp(detail, detail.tasks.find(t => t.id === id)!);
    }
    const item = followUps.find((followUp) => followUp.id === id);
    if (!item) throw new Error("Follow-up was not found.");
    item.status = "Completed";
    recordDemoCaseEvent(item.patientId, item.patient, "followup_completed", `Follow-up completed: ${item.reason}.`, item.owner, "Care coordinator");
    return item;
  },
  async escalate(id: string): Promise<FollowUp> {
    if (!isDemoMode) {
      const detail = (await getAllCaseDetails()).find(d => d.tasks.some(t => t.id === id));
      if (!detail) throw new Error("Follow-up was not found.");
      const task = detail.tasks.find(t => t.id === id)!;
      if (toFollowUp(detail, task).status !== "Overdue") throw new Error("Only overdue follow-ups can be escalated.");
      await api.post(`/cases/${encodeURIComponent(detail.caseRecord.id)}/communications`, {
        channel: "escalation", outcome: `Overdue follow-up ${id}: ${task.title}`,
      });
      return { ...toFollowUp(detail, task), escalated: true };
    }
    const item = followUps.find((followUp) => followUp.id === id);
    if (!item) throw new Error("Follow-up was not found.");
    if (item.status !== "Overdue") throw new Error("Only overdue follow-ups can be escalated.");
    item.escalated = true;
    recordDemoCaseEvent(item.patientId, item.patient, "case_escalated", `Overdue follow-up escalated: ${item.reason}.`, item.owner, "Care coordinator");
    return item;
  },
};
