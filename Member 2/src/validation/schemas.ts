import { z } from "zod";

export const CaseStatusEnum = z.enum([
  "screening",
  "referred",
  "appointment_scheduled",
  "in_care",
  "completed",
  "overdue",
  "unassigned",
]);

export const PriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const UrgencyEnum = z.enum(["routine", "urgent", "critical"]);

export const ScreeningSubmissionSchema = z.object({
  patientId: z.string().min(1, "patientId is required"),
  screeningType: z.string().min(1, "screeningType is required"),
  resultValue: z.string().min(1, "resultValue is required"),
  score: z.number().optional(),
  urgency: UrgencyEnum.optional(),
  rawPayload: z.record(z.string(), z.unknown()).optional(),
  clinicianNotes: z.string().optional(),
  assignedCareWorkerId: z.string().nullable().optional(),
  assignedCareWorkerName: z.string().nullable().optional(),
});

export type ScreeningSubmissionInput = z.infer<typeof ScreeningSubmissionSchema>;

export const CaseAssignmentSchema = z.object({
  ownerId: z.string().nullable(),
  assignedCareWorkerName: z.string().nullable().optional(),
  nextAction: z.string().min(1).optional(),
  reason: z.string().optional(),
});

export type CaseAssignmentInput = z.infer<typeof CaseAssignmentSchema>;

export const CaseStatusTransitionSchema = z.object({
  targetStatus: CaseStatusEnum,
  nextAction: z.string().min(1).optional(),
  reason: z.string().optional(),
});

export type CaseStatusTransitionInput = z.infer<typeof CaseStatusTransitionSchema>;

export const ReferralCreateSchema = z.object({
  targetFacility: z.string().min(2, "targetFacility must be at least 2 characters"),
  specialty: z.string().min(2, "specialty must be at least 2 characters"),
  urgency: UrgencyEnum.default("routine"),
  notes: z.string().optional(),
  handoffClinicianId: z.string().optional(),
  handoffNotes: z.string().optional(),
});

export type ReferralCreateInput = z.infer<typeof ReferralCreateSchema>;

export const ReferralStatusUpdateSchema = z.object({
  status: z.enum(["pending_acceptance", "accepted", "rejected", "completed", "cancelled"]),
  notes: z.string().optional(),
  handoffClinicianId: z.string().optional(),
  handoffNotes: z.string().optional(),
});

export type ReferralStatusUpdateInput = z.infer<typeof ReferralStatusUpdateSchema>;

export const ReferralHandoffSchema = z.object({
  targetClinicianId: z.string().min(1, "targetClinicianId is required"),
  targetFacility: z.string().optional(),
  handoffNotes: z.string().min(5, "handoffNotes must be at least 5 characters"),
});

export type ReferralHandoffInput = z.infer<typeof ReferralHandoffSchema>;

export const AppointmentCreateSchema = z.object({
  referralId: z.string().optional(),
  scheduledTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "scheduledTime must be a valid ISO date string",
  }),
  facility: z.string().min(2, "facility is required"),
  providerName: z.string().min(2, "providerName is required"),
});

export type AppointmentCreateInput = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentRescheduleSchema = z.object({
  scheduledTime: z.string().refine(value => !Number.isNaN(Date.parse(value)), "A valid date/time is required"),
});
export type AppointmentRescheduleInput = z.infer<typeof AppointmentRescheduleSchema>;

export const AppointmentAttendanceSchema = z.object({
  status: z.enum(["attended", "no_show", "cancelled", "rescheduled"]),
  attendanceNotes: z.string().optional(),
});

export type AppointmentAttendanceInput = z.infer<typeof AppointmentAttendanceSchema>;

export const FollowUpTaskCreateSchema = z.object({
  assignedToId: z.string().min(1, "assignedToId is required"),
  title: z.string().min(3, "title must be at least 3 characters"),
  description: z.string().optional(),
  dueDate: z.string().min(4, "dueDate is required"),
});

export type FollowUpTaskCreateInput = z.infer<typeof FollowUpTaskCreateSchema>;

export const FollowUpTaskUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
  description: z.string().optional(),
});

export type FollowUpTaskUpdateInput = z.infer<typeof FollowUpTaskUpdateSchema>;

export const NotificationAcknowledgeSchema = z.object({
  notes: z.string().optional(),
});

export type NotificationAcknowledgeInput = z.infer<typeof NotificationAcknowledgeSchema>;

export const VerifiedClosureSchema = z.object({
  outcome: z.enum([
    "care_completed",
    "treatment_plan_established",
    "declined_care",
    "lost_to_follow_up_exhausted",
  ]),
  evidenceNote: z
    .string()
    .min(10, "evidenceNote must be at least 10 characters documenting verification evidence"),
});

export type VerifiedClosureInput = z.infer<typeof VerifiedClosureSchema>;

export const CaseFilterQuerySchema = z.object({
  status: z.union([CaseStatusEnum, z.literal("all")]).optional(),
  priority: z.union([PriorityEnum, z.literal("all")]).optional(),
  assignedCareWorker: z.string().optional(),
  search: z.string().optional(),
});

export type CaseFilterQueryInput = z.infer<typeof CaseFilterQuerySchema>;

/** Synthetic patient registration for the hackathon demo. */
export const PatientCreateSchema = z.object({
  name: z.string().trim().min(2).max(100),
  age: z.number().int().min(0).max(120),
  gender: z.string().trim().min(1).max(32),
  phone: z.string().trim().max(60),
  email: z.string().trim().email(),
});
export type PatientCreateInput = z.infer<typeof PatientCreateSchema>;
