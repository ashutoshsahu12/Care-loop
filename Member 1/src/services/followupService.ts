import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, followUps, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { FollowUp, PatientCase, Role } from "../types";
export const followupService = {
  async list(role?: Role, patientId?: string): Promise<FollowUp[]> {
    if (!isDemoMode) {
      if (role === "patient") {
        const cases = (await api.get<PatientCase[]>("/patient/cases")).data;
        return cases.flatMap((patientCase) => patientCase.followups);
      }
      return (await api.get<FollowUp[]>(role && role !== "admin" ? "/followups/assigned" : "/followups")).data;
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
    if (!isDemoMode) return (await api.post<FollowUp>("/followups", { patient: payload.patient, patient_id: payload.patientId, reason: payload.reason, due: payload.due, owner: payload.owner })).data;
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
    if (!isDemoMode) return (await api.post<FollowUp>(`/followups/${id}/complete`)).data;
    const item = followUps.find((followUp) => followUp.id === id);
    if (!item) throw new Error("Follow-up was not found.");
    item.status = "Completed";
    recordDemoCaseEvent(item.patientId, item.patient, "followup_completed", `Follow-up completed: ${item.reason}.`, item.owner, "Care coordinator");
    return item;
  },
  async escalate(id: string): Promise<FollowUp> {
    if (!isDemoMode) return (await api.post<FollowUp>(`/followups/${id}/escalate`)).data;
    const item = followUps.find((followUp) => followUp.id === id);
    if (!item) throw new Error("Follow-up was not found.");
    if (item.status !== "Overdue") throw new Error("Only overdue follow-ups can be escalated.");
    item.escalated = true;
    recordDemoCaseEvent(item.patientId, item.patient, "case_escalated", `Overdue follow-up escalated: ${item.reason}.`, item.owner, "Care coordinator");
    return item;
  },
};
