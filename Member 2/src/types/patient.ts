import type { CaseStatus, Priority } from "./admin";
import type { AppointmentStatus, NotificationStatus, NotificationType } from "./domain";

export interface PatientProfile {
  id: string;
  patientReference: string;
  name: string;
  dateOfBirth: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface PatientCareJourneyStep {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: string | null;
}

export interface PatientCaseView {
  id: string;
  patientReference: string;
  status: CaseStatus;
  statusDisplay: string;
  priority: Priority;
  screeningType: string;
  screeningSummary: string;
  nextStep: string;
  targetDate: string;
  journeySteps: PatientCareJourneyStep[];
  assignedCareWorker: string | null;
}

export interface PatientAppointmentView {
  id: string;
  caseId: string;
  scheduledTime: string;
  facility: string;
  providerName: string;
  status: AppointmentStatus;
}

export interface PatientNotificationView {
  id: string;
  caseId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  acknowledgedAt?: string | null;
}

export interface PatientPortalSummary {
  patient: PatientProfile;
  activeCase: PatientCaseView | null;
  upcomingAppointments: PatientAppointmentView[];
  unreadNotifications: PatientNotificationView[];
}
