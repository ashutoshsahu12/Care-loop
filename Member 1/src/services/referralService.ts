import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { PatientCase, Referral, Role } from "../types";
export type { Referral } from "../types";
export const demoReferrals: Referral[] = [
  { id: "RF-2014", patient: "Amara Okafor", initials: "AO", specialty: "Gynecology", referredTo: "Bayview Women's Health", date: "Nov 15, 2026", status: "Accepted" },
  { id: "RF-2013", patient: "Olivia Rhye", initials: "OR", specialty: "Breast imaging", referredTo: "Bayview Imaging Center", date: "Nov 15, 2026", status: "Scheduled" },
  { id: "RF-2012", patient: "Ethan Brooks", initials: "EB", specialty: "Gastroenterology", referredTo: "Northside Digestive Care", date: "Nov 14, 2026", status: "Pending" },
];
export const referralService = {
  async list(role?: Role, patientId?: string): Promise<Referral[]> {
    if (!isDemoMode) {
      if (role === "patient") {
        const cases = (await api.get<PatientCase[]>("/patient/cases")).data;
        return cases.flatMap((patientCase) => patientCase.referrals);
      }
      return (await api.get<Referral[]>(role && role !== "admin" ? "/referrals/assigned" : "/referrals")).data;
    }
    if (role === "admin" || !role) return demoReferrals;
    if (role === "patient") return patientId === DEMO_PATIENT_ID ? demoReferrals.filter((referral) => referral.patientId === patientId || patients.some((patient) => patient.id === patientId && patient.name === referral.patient)) : [];
    const assigned = new Set(patients.filter((patient) => role === "doctor" ? patient.doctor === "Dr. Maya Chen" : patient.coordinator === "Jordan Lee").map((patient) => patient.name));
    return demoReferrals.filter((referral) => assigned.has(referral.patient));
  },
  async create(payload: { patient: string; patientId?: string; specialty: string; referredTo: string }): Promise<Referral> {
    if (!isDemoMode) return (await api.post<Referral>("/referrals", { patient: payload.patient, patient_id: payload.patientId, specialty: payload.specialty, referred_to: payload.referredTo })).data;
    const referral: Referral = {
      id: `RF-${Date.now().toString().slice(-4)}`,
      patient: payload.patient,
      patientId: payload.patientId,
      initials: payload.patient.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(),
      specialty: payload.specialty,
      referredTo: payload.referredTo,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "Pending",
    };
    demoReferrals.unshift(referral);
    recordDemoCaseEvent(payload.patientId, payload.patient, "referral_created", `${payload.specialty} referral created for ${payload.referredTo}.`, payload.patientId ? patients.find((item) => item.id === payload.patientId)?.coordinator || "Care team" : "Care team", "Care coordinator");
    return referral;
  },
  async updateStatus(id: string, status: Referral["status"]): Promise<Referral> {
    if (!isDemoMode) return (await api.patch<Referral>(`/referrals/${id}`, { status })).data;
    const referral = demoReferrals.find((item) => item.id === id);
    if (!referral) throw new Error("Referral was not found.");
    referral.status = status;
    recordDemoCaseEvent(referral.patientId, referral.patient, "referral_updated", `Referral status updated to ${status}.`, "Care team", "Care coordinator");
    return referral;
  },
};
