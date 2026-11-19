import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, appointments, patients } from "../mocks/data";
import { recordDemoCaseEvent } from "../mocks/caseEvents";
import type { Appointment, Role } from "../types";
import { BACKEND_DEMO_PATIENT_REF, findDetailByPatientRef, getAllCaseDetails, toAppointment } from "./backendBridge";
export const appointmentService = {
  async list(role?: Role, patientId?: string): Promise<Appointment[]> {
    if (!isDemoMode) {
      const details = await getAllCaseDetails();
      return details.filter(d => role !== "patient" || d.patient.patientReference === (patientId || BACKEND_DEMO_PATIENT_REF))
        .flatMap(d => d.appointments.map(a => toAppointment(d, a)));
    }
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
      const detail = await findDetailByPatientRef(patientId || "") ??
        (await getAllCaseDetails()).find(item => item.patient.name === patient);
      const targetCase = caseId || detail?.caseRecord.id;
      if (!targetCase) throw new Error("Select a patient with an active case.");
      const selectedDate = date.length === 10 ? `${date}T12:00:00.000Z` : new Date(date).toISOString();
      const demoRole = localStorage.getItem("careloop.accessToken");
      if (demoRole === "patient") {
        await api.post(`/cases/${encodeURIComponent(targetCase)}/help-requests`, {
          message: `Please help schedule ${type} on ${date}.`,
        });
        return;
      }
      await api.post(`/cases/${encodeURIComponent(targetCase)}/appointments`, {
        scheduledTime: selectedDate, facility: "CARELOOP Demo Clinic", providerName: "Care team",
      });
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
      const details = await getAllCaseDetails();
      const detail = details.find(d => d.appointments.some(a => a.id === id));
      if (!detail) throw new Error("Appointment not found.");
      const scheduledTime = date.length === 10 ? `${date}T12:00:00.000Z` : new Date(date).toISOString();
      await api.post(`/cases/${encodeURIComponent(detail.caseRecord.id)}/appointments`, {
        scheduledTime, facility: "CARELOOP Demo Clinic", providerName: "Care team",
      });
      await api.patch(`/appointments/${encodeURIComponent(id)}/attendance`, { status: "rescheduled" });
      return;
    }
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) throw new Error("Appointment was not found.");
    appointment.date = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    appointment.status = "Needs confirmation";
    recordDemoCaseEvent(appointment.patientId, appointment.patient, "appointment_updated", `Appointment rescheduled to ${appointment.date}.`, "Care team", "Care coordinator");
  },
};
