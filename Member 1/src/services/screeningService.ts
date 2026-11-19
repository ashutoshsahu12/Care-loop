import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, patients, screenings } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { Role, Screening } from "../types";
import { BACKEND_DEMO_PATIENT_REF, findDetailByPatientRef, getAllBackendPatients, getAllCaseDetails, getCaseDetails, toScreening, visibleCaseDetails } from "./backendBridge";
export const screeningService = {
  async list(role?: Role, patientId?: string): Promise<Screening[]> {
    if (!isDemoMode) {
      const details = await getAllCaseDetails();
      return visibleCaseDetails(details, role, patientId)
        .map(toScreening).filter((item): item is Screening => item !== null);
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
      if (payload.report) throw new Error("File uploads are not enabled in the synthetic-data backend. Enter the screening result as text.");
      const detail = await findDetailByPatientRef(payload.patientId || "") ??
        (await getAllCaseDetails()).find(item => item.patient.name === payload.patient);
      const targetPatient = detail?.patient ?? (await getAllBackendPatients()).find(item =>
        item.patientReference === payload.patientId || item.name === payload.patient);
      if (!targetPatient) throw new Error("Register or select an existing demo patient before screening.");
      const result = (await api.post<{ careCase: { id: string } }>("/screenings", {
        patientId: targetPatient.id, screeningType: payload.type, resultValue: payload.result,
      })).data;
      const latest = await getCaseDetails(result.careCase.id);
      const screening = toScreening(latest);
      if (!screening) throw new Error("Screening was recorded but could not be retrieved.");
      return screening;
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
