import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, appointments, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { Appointment, Role } from "../types";
export const appointmentService = {
  async list(role?: Role, patientId?: string): Promise<Appointment[]> {
    if (!isDemoMode) return (await api.get<Appointment[]>(role === "patient" ? "/appointments/me" : role && role !== "admin" ? "/appointments/assigned" : "/appointments")).data;
    if (role === "patient") {
      if (patientId !== DEMO_PATIENT_ID) return [];
      const patient = patients.find((item) => item.id === patientId);
      return appointments.filter((appointment) => appointment.patientId === patientId || appointment.patient === patient?.name);
    }
    if (role === "doctor") return appointments.filter((appointment) => appointment.clinician === "Dr. Maya Chen");
    if (role === "worker") {
      const assigned = new Set(patients.filter((patient) => patient.coordinator === "Jordan Lee").map((patient) => patient.name));
      return appointments.filter((appointment) => assigned.has(appointment.patient));
    }
    return appointments;
  },
  async request(patient: string, date: string, type: string, patientId?: string, caseId?: string): Promise<void> {
    if (!isDemoMode) {
      if (caseId) {
        await api.post(`/cases/${encodeURIComponent(caseId)}/appointments`, { appointment_at: date, type, requested_by_patient: true });
        return;
      }
      await api.post("/appointments", { patient, patient_id: patientId, date, type });
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const patientName = patient || "New patient";
    const initials = patientName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
    appointments.unshift({ id: `AP-${Date.now().toString().slice(-4)}`, patient: patientName, patientId, initials, type, date: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), time: "Time to be confirmed", clinician: "Care team", status: "Needs confirmation" });
    recordDemoCaseEvent(patientId, patientName, "appointment_recorded", `${type} appointment request recorded for ${new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" })}.`, "Care team", "Care coordinator");
  },
  async reschedule(id: string, date: string): Promise<void> {
    if (!isDemoMode) {
      await api.patch(`/appointments/${id}`, { date });
      return;
    }
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) throw new Error("Appointment was not found.");
    appointment.date = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    appointment.status = "Needs confirmation";
    recordDemoCaseEvent(appointment.patientId, appointment.patient, "appointment_updated", `Appointment rescheduled to ${appointment.date}.`, "Care team", "Care coordinator");
  },
};
