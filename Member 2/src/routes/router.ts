import type { ID1Database } from "../db/client";
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

  async handle(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return handleCors();
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      const user = await this.authService.resolveUser(request);

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
        return jsonResponse(cases);
      }

      // Match /api/cases/:id routes
      const caseMatch = path.match(/^\/api\/cases\/([^/]+)$/);
      if (method === "GET" && caseMatch) {
        const caseId = caseMatch[1];
        const details = await this.caseService.getCaseDetails(caseId);
        const referrals = await this.referralService.getReferralsByCase(caseId);
        const appointments = await this.appointmentService.getAppointmentsByCase(caseId);
        const tasks = await this.taskService.getTasksByCase(caseId);
        const timeline = await this.timelineService.getCaseTimeline(caseId);
        return jsonResponse({
          ...details,
          referrals,
          appointments,
          tasks,
          timeline,
        });
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
        });
        return jsonResponse(event, 201);
      }

      // GET /api/cases/:id/timeline
      const timelineMatch = path.match(/^\/api\/cases\/([^/]+)\/timeline$/);
      if (method === "GET" && timelineMatch) {
        const caseId = timelineMatch[1];
        const events = await this.timelineService.getCaseTimeline(caseId);
        return jsonResponse(events);
      }

      // GET /api/cases/:id/escalations
      const caseEscMatch = path.match(/^\/api\/cases\/([^/]+)\/escalations$/);
      if (method === "GET" && caseEscMatch) {
        const caseId = caseEscMatch[1];
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
        const appointments = await this.appointmentService.getAppointmentsByCase(caseId);
        return jsonResponse(appointments);
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
        const updated = await this.notificationService.acknowledgeNotification(notifId, user, input.notes);
        return jsonResponse(updated);
      }

      // GET /api/cases/:id/notifications
      const notifCaseMatch = path.match(/^\/api\/cases\/([^/]+)\/notifications$/);
      if (method === "GET" && notifCaseMatch) {
        const caseId = notifCaseMatch[1];
        const notifs = await this.notificationService.getNotificationsByCase(caseId);
        return jsonResponse(notifs);
      }

      // --- Member 1 Patient Portal Endpoints ---

      // GET /api/patient/summary or GET /api/patient/:id/summary
      const patientSummaryMatch = path.match(/^\/api\/patient\/(?:([^/]+)\/)?summary$/);
      if (method === "GET" && patientSummaryMatch) {
        const explicitId = patientSummaryMatch[1] ?? url.searchParams.get("patientId");
        const patientTarget = explicitId || (user.role === "patient" ? user.id : "pat-1001");
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary);
      }

      // GET /api/patient/profile
      if (method === "GET" && path === "/api/patient/profile") {
        const patientTarget = url.searchParams.get("patientId") || (user.role === "patient" ? user.id : "pat-1001");
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary.patient);
      }

      // GET /api/patient/appointments
      if (method === "GET" && path === "/api/patient/appointments") {
        const patientTarget = url.searchParams.get("patientId") || (user.role === "patient" ? user.id : "pat-1001");
        const summary = await this.caseService.getPatientPortalSummary(patientTarget);
        return jsonResponse(summary.upcomingAppointments);
      }

      // GET /api/patient/notifications
      if (method === "GET" && path === "/api/patient/notifications") {
        const patientTarget = url.searchParams.get("patientId") || (user.role === "patient" ? user.id : "pat-1001");
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
