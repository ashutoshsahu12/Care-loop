import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { CaseStatus, Patient, Role } from "../types";

const delay = () => new Promise((resolve) => window.setTimeout(resolve, 180));
export const patientService = {
  async list(role?: Role, patientId?: string): Promise<Patient[]> {
    if (!isDemoMode) {
      if (role === "patient") {
        const { data } = await api.get<Patient>("/patients/me");
        return data ? [data] : [];
      }
      return (await api.get<Patient[]>(role && role !== "admin" ? "/patients/assigned" : "/patients")).data;
    }
    await delay();
    if (role === "patient") return patientId === DEMO_PATIENT_ID ? patients.filter((patient) => patient.id === patientId) : [];
    return [...patients].filter((patient) => role === "doctor" ? patient.doctor === "Dr. Maya Chen" : role === "worker" ? patient.coordinator === "Jordan Lee" : true);
  },
  async get(id: string, role?: Role, patientId?: string): Promise<Patient | undefined> {
    if (!isDemoMode) return (await api.get<Patient>(`/patients/${id}`)).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) return undefined;
    if (role === "doctor" && patient.doctor !== "Dr. Maya Chen") return undefined;
    if (role === "worker" && patient.coordinator !== "Jordan Lee") return undefined;
    if (role === "patient" && (patientId !== DEMO_PATIENT_ID || patient.id !== patientId)) return undefined;
    return patient;
  },
  async getMyProfile(userId: string): Promise<Patient | undefined> {
    if (!isDemoMode) return (await api.get<Patient>("/patients/me")).data;
    await delay();
    return userId === "U-004" ? patients.find((patient) => patient.id === "CL-2048") : undefined;
  },
  async create(payload: Pick<Patient, "name" | "phone" | "email" | "age" | "gender">): Promise<Patient> {
    if (!isDemoMode) return (await api.post<Patient>("/patients", payload)).data;
    await delay();
    const initials = payload.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const created: Patient = { ...payload, id: `CL-${Date.now().toString().slice(-4)}`, initials, location: "San Francisco, CA", screening: "Not yet screened", result: "Awaiting screening", status: "In progress", priority: "Routine", doctor: "Unassigned", coordinator: "Jordan Lee", lastActivity: "Just now", nextAction: "Schedule screening" };
    patients.unshift(created);
    return created;
  },
  async closeCase(id: string, caseId: string, confirmationNote: string, verifiedBy: string): Promise<Patient> {
    if (confirmationNote.trim().length < 8) throw new Error("Document the completed follow-up or treatment before closing this case.");
    if (!caseId) throw new Error("A linked case is required before requesting verified closure.");
    if (!isDemoMode) return (await api.post<Patient>(`/cases/${encodeURIComponent(caseId)}/closure`, { outcome: "Care completion confirmed", evidence_note: confirmationNote })).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) throw new Error("Patient record was not found.");
    if (patient.caseId !== caseId) throw new Error("The requested case does not belong to this patient.");
    if (patient.status !== "Resolved") throw new Error("This case is not ready to close. Complete and document the required care first.");
    const verifiedAt = new Date().toISOString();
    patient.status = "Closed";
    patient.nextAction = "Case closed · care documented";
    patient.lastActivity = "Just now";
    patient.closureRecord = { outcome: "Care completion confirmed", evidenceNote: confirmationNote.trim(), verifiedBy, verifiedAt };
    recordDemoCaseEvent(patient.id, patient.name, "case_verified_closed", "Care completion was verified and the case was closed.", verifiedBy, "Authorized care team",);
    return patient;
  },
  async addClinicalNote(id: string, text: string, author: string): Promise<Patient> {
    if (!isDemoMode) return (await api.post<Patient>(`/patients/${id}/notes`, { text })).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) throw new Error("Patient record was not found.");
    patient.clinicalNotes = [{ id: `CN-${Date.now()}`, author, createdAt: "Just now", text }, ...(patient.clinicalNotes || [])];
    patient.lastActivity = "Just now";
    recordDemoCaseEvent(patient.id, patient.name, "clinical_review", "A clinician added a note to the internal care record.", author, "Doctor");
    return patient;
  },
  async updateProgress(id: string, nextAction: string, status: Exclude<CaseStatus, "Closed">): Promise<Patient> {
    if (!isDemoMode) return (await api.patch<Patient>(`/patients/${id}/progress`, { next_action: nextAction, status })).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) throw new Error("Patient record was not found.");
    patient.nextAction = nextAction;
    patient.status = status;
    patient.lastActivity = "Just now";
    recordDemoCaseEvent(patient.id, patient.name, "case_status_updated", `Case status updated to ${status}; next action: ${nextAction}.`, "Care team", "Care team");
    return patient;
  },
  async recordCommunication(id: string, channel: string, outcome: string): Promise<Patient> {
    if (!isDemoMode) return (await api.post<Patient>(`/patients/${id}/communications`, { channel, outcome })).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) throw new Error("Patient record was not found.");
    patient.communicationLog = [{ id: `CM-${Date.now()}`, createdAt: "Just now", channel, outcome }, ...(patient.communicationLog || [])];
    patient.lastActivity = "Just now";
    recordDemoCaseEvent(patient.id, patient.name, "followup_activity", `${channel} contact attempt recorded: ${outcome}`, "Care team", "Care coordinator");
    return patient;
  },
  async assignCareTeam(id: string, doctor: string, coordinator: string): Promise<Patient> {
    if (!isDemoMode) return (await api.patch<Patient>(`/patients/${id}/care-team`, { doctor, coordinator })).data;
    await delay();
    const patient = patients.find((item) => item.id === id);
    if (!patient) throw new Error("Patient record was not found.");
    patient.doctor = doctor;
    patient.coordinator = coordinator;
    patient.lastActivity = "Just now";
    recordDemoCaseEvent(patient.id, patient.name, "case_assigned", `Care team updated. Assigned doctor: ${doctor}; coordinator: ${coordinator}.`, "Care team", "Care team");
    return patient;
  },
};
