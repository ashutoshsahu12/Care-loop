import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, patients, screenings } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { PatientCase, Role, Screening } from "../types";
export const screeningService = {
  async list(role?: Role, patientId?: string): Promise<Screening[]> {
    if (!isDemoMode) {
      if (role === "patient") {
        const cases = (await api.get<PatientCase[]>("/patient/cases")).data;
        return cases.map((patientCase) => patientCase.screening);
      }
      return (await api.get<Screening[]>(role && role !== "admin" ? "/screenings/assigned" : "/screenings")).data;
    }
    if (role === "admin" || !role) return screenings;
    if (role === "patient") {
      if (patientId !== DEMO_PATIENT_ID) return [];
      const patient = patients.find((item) => item.id === patientId);
      return screenings.filter((record) => record.patientId === patientId || record.patient === patient?.name);
    }
    const assigned = new Set(patients.filter((patient) => role === "doctor" ? patient.doctor === "Dr. Maya Chen" : patient.coordinator === "Jordan Lee").map((patient) => patient.name));
    return screenings.filter((record) => assigned.has(record.patient));
  },
  async create(payload: { patient: string; patientId?: string; type: string; result: string; report?: File }): Promise<Screening> {
    if (!isDemoMode) {
      const body = new FormData();
      body.append("patient", payload.patient);
      if (payload.patientId) body.append("patient_id", payload.patientId);
      body.append("type", payload.type);
      body.append("result", payload.result);
      if (payload.report) body.append("report", payload.report);
      return (await api.post<Screening>("/screenings", body, { headers: { "Content-Type": "multipart/form-data" } })).data;
    }
    const initials = payload.patient.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    const resultText = payload.result.toLowerCase();
    const status: Screening["status"] = /normal/i.test(resultText)
      ? "Normal"
      : /abnormal|positive|suspicious|birads|hpv|high-grade|indeterminate/i.test(resultText)
        ? "Abnormal"
        : "Pending review";
    const created: Screening = {
      id: `SR-${Date.now().toString().slice(-4)}`,
      patient: payload.patient,
      patientId: payload.patientId,
      initials,
      type: payload.type,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      recordedAt: new Date().toISOString(),
      result: payload.result,
      status,
      clinician: "Pending review",
      reviewState: "Awaiting human review",
    };
    screenings.unshift(created);
    recordDemoCaseEvent(payload.patientId, payload.patient, "screening_recorded", `${payload.type} screening record ${created.id} recorded for human review.`, "Care team", "Care worker");
    return created;
  },
};
