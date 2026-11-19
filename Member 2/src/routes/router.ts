import type { ID1Database } from "../db/client";
import type { User } from "../types/auth";
import { AuthService } from "../services/authService";
import { CaseService } from "../services/caseService";
import { ReferralService } from "../services/referralService";
import { AppointmentService } from "../services/appointmentService";
import { TaskService } from "../services/taskService";
import { NotificationService } from "../services/notificationService";
import { EscalationService } from "../services/escalationService";
import { AnalyticsService } from "../services/analyticsService";
import { TimelineService } from "../services/timelineService";
import {
  AppointmentAttendanceSchema,
  AppointmentCreateSchema,
  AppointmentRescheduleSchema,
  CaseAssignmentSchema,
  CaseFilterQuerySchema,
  CaseStatusTransitionSchema,
  FollowUpTaskCreateSchema,
  FollowUpTaskUpdateSchema,
  NotificationAcknowledgeSchema,
  ReferralCreateSchema,
  ReferralHandoffSchema,
  ReferralStatusUpdateSchema,
  ScreeningSubmissionSchema,
  VerifiedClosureSchema,
  PatientCreateSchema,
} from "../validation/schemas";
import { ZodError } from "zod";

function jsonResponse(data: unknown, status: number = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-role",
      ...headers,
    },
  });
}

function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-user-id, x-user-role",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export class AppRouter {
  private db: ID1Database;
  private authService: AuthService;
  private timelineService: TimelineService;
  private notificationService: NotificationService;
  private caseService: CaseService;
  private referralService: ReferralService;
  private appointmentService: AppointmentService;
  private taskService: TaskService;
  private escalationService: EscalationService;
  private analyticsService: AnalyticsService;

  constructor(db: ID1Database) {
    this.db = db;
    this.authService = new AuthService(db);
    this.timelineService = new TimelineService(db);
    this.notificationService = new NotificationService(db, this.timelineService);
    this.caseService = new CaseService(db, this.timelineService, this.notificationService);
    this.referralService = new ReferralService(db, this.timelineService);
    this.appointmentService = new AppointmentService(db, this.timelineService);
    this.taskService = new TaskService(db, this.timelineService);
    this.escalationService = new EscalationService(db);
    this.analyticsService = new AnalyticsService(db);
  }

  /** Patient-role demo requests may only access cases matching their seeded patient email.
   * This is ownership scoping, not a substitute for real authentication.
   */
  private async ensurePatientCaseAccess(user: User, caseId: string): Promise<void> {
    if (user.role !== "patient") return;
    const found = await this.db.prepare(
      "SELECT c.id FROM cases c JOIN patients p ON c.patient_id = p.id WHERE c.id = ? AND p.email = ?"
    ).bind(caseId, user.email).first<{ id: string }>();
    if (!found) throw new Error("Forbidden: This case is not linked to the selected patient.");
  }

  private async resolvePatientTarget(user: User, requested?: string | null): Promise<string> {
    if (user.role !== "patient") return requested || "pat-1001";
    const patient = await this.db.prepare(
      "SELECT id, patient_reference as patientReference FROM patients WHERE email = ?"
    ).bind(user.email).first<{ id: string; patientReference: string }>();
    if (!patient || (requested && requested !== patient.id && requested !== patient.patientReference)) {
      throw new Error("Forbidden: You can only view your own demo patient profile.");
    }
    return patient.id;
  }

  private async getVisibleTimeline(caseId: string, user: User) {
    const timeline = await this.timelineService.getCaseTimeline(caseId);
    if (user.role !== "patient") return timeline;
    return timeline
      .filter(event => event.eventType !== "clinical_review" && event.eventType !== "followup_activity")
      .map(event => ({ ...event, metadata: null }));
  }

  private async notificationRecipientIds(user: User): Promise<Set<string>> {
    if (user.role !== "patient") return new Set([user.id]);
    const patientId = await this.resolvePatientTarget(user);
    const patient = await this.db.prepare(
      "SELECT patient_reference as patientReference FROM patients WHERE id = ?"
    ).bind(patientId).first<{ patientReference: string }>();
    return new Set([user.id, patientId, patient?.patientReference ?? patientId]);
  }

  async handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      const user = await this.authService.resolveUser(request);

      // Synthetic patient registration and retrieval for Member 1 care-worker onboarding.
      if (method === "GET" && path === "/api/patients") {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const rows = await this.db.prepare(
          "SELECT id, patient_reference as patientReference, name, date_of_birth as dateOfBirth, gender, phone, email, address FROM patients ORDER BY created_at DESC"
        ).all();
        return jsonResponse(rows.results);
      }

      const patientMatch = path.match(/^\/api\/patients\/([^/]+)$/);
      if (method === "GET" && patientMatch) {
        const patient = await this.db.prepare(
          "SELECT id, patient_reference as patientReference, name, date_of_birth as dateOfBirth, gender, phone, email, address FROM patients WHERE id = ? OR patient_reference = ?"
        ).bind(patientMatch[1], patientMatch[1]).first<{ email: string | null }>();
        if (patient && user.role === "patient" && patient.email !== user.email) {
          throw new Error("Forbidden: You can only view your own demo patient profile.");
        }
        return patient ? jsonResponse(patient) : jsonResponse({ message: "Patient not found" }, 404);
      }

      if (method === "POST" && path === "/api/patients") {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const input = PatientCreateSchema.parse(await request.json());
        const now = new Date().toISOString();
        const suffix = `${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
        const id = `pat-${suffix}`;
        const patientReference = `CL-P-${suffix}`;
        const dateOfBirth = `${new Date().getUTCFullYear() - input.age}-01-01`;
        await this.db.prepare(
          "INSERT INTO patients (id, patient_reference, name, date_of_birth, gender, phone, email, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(id, patientReference, input.name, dateOfBirth, input.gender, input.phone, input.email, "Demo care network", now, now).run();
        return jsonResponse({ id, patientReference, name: input.name, dateOfBirth,
          gender: input.gender, phone: input.phone, email: input.email, address: "Demo care network" }, 201);
      }

      // GET /api/team — read-only directory of seeded demo care team users.
      if (method === "GET" && path === "/api/team") {
        this.authService.checkPermission(user, ["admin"]);
        const result = await this.db.prepare(
          `SELECT u.id, u.name, u.role,
                  (SELECT COUNT(DISTINCT c.patient_id) FROM cases c WHERE c.owner_id = u.id) as patients
           FROM users u WHERE u.role IN ('clinician', 'care_worker')
           ORDER BY u.role, u.name`
        ).all<{ id: string; name: string; role: string; patients: number }>();
        return jsonResponse((result.results || []).map(item => ({
          id: item.id,
          name: item.name,
          initials: item.name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").slice(0, 2).toUpperCase(),
          role: item.role === "clinician" ? "Physician" : "Care coordinator",
          specialty: item.role === "clinician" ? "Clinical care" : "Care coordination",
          location: "CARELOOP Demo Network",
          patients: Number(item.patients),
          status: "Active",
        })));
      }

      // --- Member 3 Admin Endpoints ---

      // GET /api/admin/overview
      if (method === "GET" && path === "/api/admin/overview") {
        this.authService.checkPermission(user, ["admin"]);
        const overview = await this.analyticsService.getOverview();
        return jsonResponse(overview);
      }

      // GET /api/admin/cases
      if (method === "GET" && path === "/api/admin/cases") {
        this.authService.checkPermission(user, ["admin"]);
        const filters = CaseFilterQuerySchema.parse({
          status: url.searchParams.get("status") ?? undefined,
          priority: url.searchParams.get("priority") ?? undefined,
          assignedCareWorker: url.searchParams.get("assignedCareWorker") ?? undefined,
          search: url.searchParams.get("search") ?? undefined,
        });
        const cases = await this.caseService.getCases(filters);
        return jsonResponse(cases);
      }

      // GET /api/admin/escalations
      if (method === "GET" && path === "/api/admin/escalations") {
        this.authService.checkPermission(user, ["admin"]);
        const escalations = await this.escalationService.getEscalations();
        return jsonResponse(escalations);
      }

      // GET /api/admin/at-risk
      if (method === "GET" && path === "/api/admin/at-risk") {
        this.authService.checkPermission(user, ["admin"]);
        const atRisk = await this.escalationService.getAtRiskCases();
        return jsonResponse(atRisk);
      }

      // GET /api/admin/analytics
      if (method === "GET" && path === "/api/admin/analytics") {
        this.authService.checkPermission(user, ["admin"]);
        const analytics = await this.analyticsService.getAnalytics();
        return jsonResponse(analytics);
      }

      // --- Screening & Care Coordination Endpoints ---

      // POST /api/screenings - Submit screening result and auto-create case
      if (method === "POST" && path === "/api/screenings") {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const body = await request.json();
        const input = ScreeningSubmissionSchema.parse(body);
        const result = await this.caseService.submitScreeningAndCreateCase(input, user);
        return jsonResponse(result, 201);
      }

      // GET /api/cases - List cases with optional filters
      if (method === "GET" && path === "/api/cases") {
        const filters = CaseFilterQuerySchema.parse({
          status: url.searchParams.get("status") ?? undefined,
          priority: url.searchParams.get("priority") ?? undefined,
          assignedCareWorker: url.searchParams.get("assignedCareWorker") ?? undefined,
          search: url.searchParams.get("search") ?? undefined,
        });
        const cases = await this.caseService.getCases(filters);
        if (user.role === "patient") {
          const target = await this.resolvePatientTarget(user);
          const allowed = await this.db.prepare(
            "SELECT patient_reference as patientReference FROM patients WHERE id = ?"
          ).bind(target).first<{ patientReference: string }>();
          return jsonResponse(cases.filter(record => record.patientReference === allowed?.patientReference));
        }
        return jsonResponse(cases);
      }

      // Match /api/cases/:id routes
      const caseMatch = path.match(/^\/api\/cases\/([^/]+)$/);
      if (method === "GET" && caseMatch) {
        const caseId = caseMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const details = await this.caseService.getCaseDetails(caseId);
        const referrals = await this.referralService.getReferralsByCase(caseId);
        const appointments = await this.appointmentService.getAppointmentsByCase(caseId);
        const tasks = await this.taskService.getTasksByCase(caseId);
        const timeline = await this.getVisibleTimeline(caseId, user);
        if (user.role === "patient") {
          const screening = details.screeningResult;
          return jsonResponse({
            caseRecord: details.caseRecord,
            patient: details.patient,
            screeningResult: screening ? {
              id: screening.id, screeningType: screening.screeningType, resultValue: screening.resultValue,
              status: screening.status, createdAt: screening.createdAt,
            } : null,
            referrals: referrals.map(({ id, specialty, targetFacility, createdAt, status }) => ({ id, specialty, targetFacility, createdAt, status })),
            appointments: appointments.map(({ id, caseId, referralId, scheduledTime, facility, providerName, status }) => ({ id, caseId, referralId, scheduledTime, facility, providerName, status })),
            tasks: tasks.map(({ id, title, dueDate, status, assignedToId }) => ({ id, title, dueDate, status, assignedToId })),
            timeline,
          });
        }
        return jsonResponse({ ...details, referrals, appointments, tasks, timeline });
      }

      // PATCH /api/cases/:id/assign
      const assignMatch = path.match(/^\/api\/cases\/([^/]+)\/assign$/);
      if (method === "PATCH" && assignMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const caseId = assignMatch[1];
        const body = await request.json();
        const input = CaseAssignmentSchema.parse(body);
        const updated = await this.caseService.assignCase(caseId, input, user);
        return jsonResponse(updated);
      }

      // PATCH /api/cases/:id/status
      const statusMatch = path.match(/^\/api\/cases\/([^/]+)\/status$/);
      if (method === "PATCH" && statusMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const caseId = statusMatch[1];
        const body = await request.json();
        const input = CaseStatusTransitionSchema.parse(body);
        const updated = await this.caseService.transitionCaseStatus(
          caseId,
          input.targetStatus,
          user,
          input.reason,
          input.nextAction
        );
        return jsonResponse(updated);
      }

      // POST /api/cases/:id/close - Verified Case Closure
      const closeMatch = path.match(/^\/api\/cases\/([^/]+)\/close$/);
      if (method === "POST" && closeMatch) {
        this.authService.checkPermission(user, ["admin", "clinician"]);
        const caseId = closeMatch[1];
        const body = await request.json();
        const input = VerifiedClosureSchema.parse(body);
        const result = await this.caseService.closeCase(caseId, input, user);
        return jsonResponse(result);
      }

      // POST /api/cases/:id/help-requests — synthetic patient portal assistance
      const helpMatch = path.match(/^\/api\/cases\/([^/]+)\/help-requests$/);
      if (method === "POST" && helpMatch) {
        const body = (await request.json()) as { message?: unknown };
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (message.length < 8 || message.length > 1000) {
          return jsonResponse({ message: "Help request must be 8 to 1000 characters." }, 400);
        }
        await this.ensurePatientCaseAccess(user, helpMatch[1]);
        await this.caseService.getCaseDetails(helpMatch[1]);
        const event = await this.timelineService.recordCaseEvent({
          caseId: helpMatch[1], actorId: user.id, actorRole: user.role,
          eventType: "help_requested",
          summary: "Patient requested assistance from the care team.",
          metadata: { message },
        });
        return jsonResponse(event, 201);
      }

      // Record synthetic-data clinical review / outreach notes from Member 1.
      const noteMatch = path.match(/^\/api\/cases\/([^/]+)\/(notes|communications)$/);
      if (method === "POST" && noteMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const body = (await request.json()) as { text?: unknown; channel?: unknown; outcome?: unknown };
        const message = noteMatch[2] === "notes"
          ? (typeof body.text === "string" ? body.text.trim() : "")
          : [body.channel, body.outcome].filter(part => typeof part === "string").join(": ").trim();
        if (message.length < 3 || message.length > 2000) {
          return jsonResponse({ message: "A note between 3 and 2000 characters is required." }, 400);
        }
        await this.caseService.getCaseDetails(noteMatch[1]);
        const event = await this.timelineService.recordCaseEvent({
          caseId: noteMatch[1], actorId: user.id, actorRole: user.role,
          eventType: noteMatch[2] === "notes" ? "clinical_review" : "followup_activity",
          summary: message,
          metadata: noteMatch[2] === "communications" ? { channel: body.channel, outcome: body.outcome } : undefined,
        });
        return jsonResponse(event, 201);
      }

      // GET /api/cases/:id/timeline
      const timelineMatch = path.match(/^\/api\/cases\/([^/]+)\/timeline$/);
      if (method === "GET" && timelineMatch) {
        const caseId = timelineMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const events = await this.getVisibleTimeline(caseId, user);
        return jsonResponse(events);
      }

      // GET /api/cases/:id/escalations
      const caseEscMatch = path.match(/^\/api\/cases\/([^/]+)\/escalations$/);
      if (method === "GET" && caseEscMatch) {
        const caseId = caseEscMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const details = await this.caseService.getCaseDetails(caseId);
        return jsonResponse({
          caseId,
          escalations: details.escalations,
          atRisk: details.atRisk,
        });
      }

      // POST /api/cases/:id/referrals
      const refCreateMatch = path.match(/^\/api\/cases\/([^/]+)\/referrals$/);
      if (method === "POST" && refCreateMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const caseId = refCreateMatch[1];
        const body = await request.json();
        const input = ReferralCreateSchema.parse(body);
        const referral = await this.referralService.createReferral(caseId, input, user);
        return jsonResponse(referral, 201);
      }

      // GET /api/cases/:id/referrals
      if (method === "GET" && refCreateMatch) {
        const caseId = refCreateMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const referrals = await this.referralService.getReferralsByCase(caseId);
        return jsonResponse(referrals);
      }

      // PATCH /api/referrals/:id
      const refUpdateMatch = path.match(/^\/api\/referrals\/([^/]+)$/);
      if (method === "PATCH" && refUpdateMatch) {
        this.authService.checkPermission(user, ["admin", "clinician"]);
        const referralId = refUpdateMatch[1];
        const body = await request.json();
        const input = ReferralStatusUpdateSchema.parse(body);
        const updated = await this.referralService.updateReferralStatus(referralId, input, user);
        return jsonResponse(updated);
      }

      // POST /api/referrals/:id/handoff - Clinician-to-clinician handoff
      const refHandoffMatch = path.match(/^\/api\/referrals\/([^/]+)\/handoff$/);
      if (method === "POST" && refHandoffMatch) {
        this.authService.checkPermission(user, ["admin", "clinician"]);
        const referralId = refHandoffMatch[1];
        const body = await request.json();
        const input = ReferralHandoffSchema.parse(body);
        const updated = await this.referralService.handoffReferral(referralId, input, user);
        return jsonResponse(updated);
      }

      // POST /api/cases/:id/appointments
      const aptCreateMatch = path.match(/^\/api\/cases\/([^/]+)\/appointments$/);
      if (method === "POST" && aptCreateMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const caseId = aptCreateMatch[1];
        const body = await request.json();
        const input = AppointmentCreateSchema.parse(body);
        const apt = await this.appointmentService.scheduleAppointment(caseId, input, user);
        return jsonResponse(apt, 201);
      }

      // GET /api/cases/:id/appointments
      if (method === "GET" && aptCreateMatch) {
        const caseId = aptCreateMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const appointments = await this.appointmentService.getAppointmentsByCase(caseId);
        return jsonResponse(appointments);
      }

      // PATCH /api/appointments/:id — modify an existing appointment, no duplicate rows.
      const rescheduleMatch = path.match(/^\/api\/appointments\/([^/]+)$/);
      if (method === "PATCH" && rescheduleMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const input = AppointmentRescheduleSchema.parse(await request.json());
        const appointment = await this.appointmentService.rescheduleAppointment(rescheduleMatch[1], input, user);
        return jsonResponse(appointment);
      }

      // PATCH /api/appointments/:id/attendance
      const aptAttMatch = path.match(/^\/api\/appointments\/([^/]+)\/attendance$/);
      if (method === "PATCH" && aptAttMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const appointmentId = aptAttMatch[1];
        const body = await request.json();
        const input = AppointmentAttendanceSchema.parse(body);
        const updated = await this.appointmentService.recordAttendance(appointmentId, input, user);
        return jsonResponse(updated);
      }

      // POST /api/cases/:id/tasks
      const taskCreateMatch = path.match(/^\/api\/cases\/([^/]+)\/tasks$/);
      if (method === "POST" && taskCreateMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const caseId = taskCreateMatch[1];
        const body = await request.json();
        const input = FollowUpTaskCreateSchema.parse(body);
        const task = await this.taskService.createTask(caseId, input, user);
        return jsonResponse(task, 201);
      }

      // GET /api/cases/:id/tasks
      if (method === "GET" && taskCreateMatch) {
        const caseId = taskCreateMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const tasks = await this.taskService.getTasksByCase(caseId);
        return jsonResponse(tasks);
      }

      // PATCH /api/tasks/:id
      const taskUpdateMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
      if (method === "PATCH" && taskUpdateMatch) {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        const taskId = taskUpdateMatch[1];
        const body = await request.json();
        const input = FollowUpTaskUpdateSchema.parse(body);
        const updated = await this.taskService.updateTask(taskId, input, user);
        return jsonResponse(updated);
      }

      // POST /api/notifications/:id/acknowledge
      const notifAckMatch = path.match(/^\/api\/notifications\/([^/]+)\/acknowledge$/);
      if (method === "POST" && notifAckMatch) {
        const notifId = notifAckMatch[1];
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          // empty body ok
        }
        const input = NotificationAcknowledgeSchema.parse(body);
        const recipient = await this.db.prepare(
          "SELECT recipient_id as recipientId, recipient_role as recipientRole FROM notifications WHERE id = ?"
        ).bind(notifId).first<{ recipientId: string; recipientRole: string }>();
        if (recipient && (recipient.recipientRole !== user.role ||
          !(await this.notificationRecipientIds(user)).has(recipient.recipientId))) {
          throw new Error("Forbidden: This notification is not addressed to you.");
        }
        const updated = await this.notificationService.acknowledgeNotification(notifId, user, input.notes);
        return jsonResponse(updated);
      }

      // GET /api/cases/:id/notifications
      const notifCaseMatch = path.match(/^\/api\/cases\/([^/]+)\/notifications$/);
      if (method === "GET" && notifCaseMatch) {
        const caseId = notifCaseMatch[1];
        await this.ensurePatientCaseAccess(user, caseId);
        const notifs = await this.notificationService.getNotificationsByCase(caseId);
        if (user.role !== "patient") return jsonResponse(notifs);
        const recipients = await this.notificationRecipientIds(user);
        return jsonResponse(notifs.filter(item => item.recipientRole === user.role && recipients.has(item.recipientId)));
      }

      if (method === "GET" && path === "/api/notifications") {
        this.authService.checkPermission(user, ["admin", "clinician", "care_worker"]);
        return jsonResponse(await this.notificationService.getNotificationsForUser(user));
      }

      // --- Member 1 Patient Portal Endpoints ---

      // GET /api/patient/summary or GET /api/patient/:id/summary
      const patientSummaryMatch = path.match(/^\/api\/patient\/(?:([^/]+)\/)?summary$/);
      if (method === "GET" && patientSummaryMatch) {
        const explicitId = patientSummaryMatch[1] ?? url.searchParams.get("patientId");
        const patientTarget = await this.resolvePatientTarget(user, explicitId);
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary);
      }

      // GET /api/patient/profile
      if (method === "GET" && path === "/api/patient/profile") {
        const patientTarget = await this.resolvePatientTarget(user, url.searchParams.get("patientId"));
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary.patient);
      }

      // GET /api/patient/appointments
      if (method === "GET" && path === "/api/patient/appointments") {
        const patientTarget = await this.resolvePatientTarget(user, url.searchParams.get("patientId"));
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary.upcomingAppointments);
      }

      // GET /api/patient/notifications
      if (method === "GET" && path === "/api/patient/notifications") {
        const patientTarget = await this.resolvePatientTarget(user, url.searchParams.get("patientId"));
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary.unreadNotifications);
      }

      // Health check endpoint
      if (method === "GET" && (path === "/" || path === "/health" || path === "/api/health")) {
        return jsonResponse({
          status: "healthy",
          service: "CARELOOP Care Coordination Engine",
          version: "1.0.0",
        });
      }

      return jsonResponse({ message: `Not Found: ${method} ${path}` }, 404);
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return jsonResponse(
          {
            message: "Validation Error",
            errors: err.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          400
        );
      }

      const errorMessage = (err as Error).message || "Internal Server Error";
      const status = errorMessage.startsWith("Forbidden")
        ? 403
        : errorMessage.includes("not found")
        ? 404
        : 400;

      return jsonResponse({ message: errorMessage }, status);
    }
  }
}
