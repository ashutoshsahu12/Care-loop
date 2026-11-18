import type { ID1Database } from "../db/client";
import type { Notification, NotificationType, NotificationStatus } from "../types/domain";
import type { UserRole, User } from "../types/auth";
import { TimelineService } from "./timelineService";

export class NotificationService {
  private db: ID1Database;
  private timeline: TimelineService;

  constructor(db: ID1Database, timeline?: TimelineService) {
    this.db = db;
    this.timeline = timeline ?? new TimelineService(db);
  }

  async createNotification(input: {
    caseId?: string | null;
    recipientId: string;
    recipientRole: UserRole;
    type: NotificationType;
    title: string;
    message: string;
  }): Promise<Notification> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO notifications 
        (id, case_id, recipient_id, recipient_role, type, title, message, status, acknowledged_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'sent', NULL, ?)`
      )
      .bind(
        id,
        input.caseId ?? null,
        input.recipientId,
        input.recipientRole,
        input.type,
        input.title,
        input.message,
        now
      )
      .run();

    return {
      id,
      caseId: input.caseId ?? null,
      recipientId: input.recipientId,
      recipientRole: input.recipientRole,
      type: input.type,
      title: input.title,
      message: input.message,
      status: "sent",
      createdAt: now,
    };
  }

  async acknowledgeNotification(notificationId: string, actor: User, notes?: string): Promise<Notification> {
    const now = new Date().toISOString();

    const existing = await this.db
      .prepare("SELECT * FROM notifications WHERE id = ?")
      .bind(notificationId)
      .first<{
        id: string;
        case_id: string | null;
        recipient_id: string;
        recipient_role: UserRole;
        type: NotificationType;
        title: string;
        message: string;
        status: NotificationStatus;
        acknowledged_at: string | null;
        created_at: string;
      }>();

    if (!existing) {
      throw new Error(`Notification '${notificationId}' not found`);
    }

    await this.db
      .prepare(`UPDATE notifications SET status = 'acknowledged', acknowledged_at = ? WHERE id = ?`)
      .bind(now, notificationId)
      .run();

    if (existing.case_id) {
      await this.timeline.recordCaseEvent({
        caseId: existing.case_id,
        actorId: actor.id,
        actorRole: actor.role,
        eventType: "patient_acknowledged",
        summary: `Notification '${existing.title}' acknowledged by ${actor.name} (${actor.role})`,
        metadata: {
          notificationId,
          type: existing.type,
          notes,
        },
        createdAt: now,
      });
    }

    return {
      id: existing.id,
      caseId: existing.case_id,
      recipientId: existing.recipient_id,
      recipientRole: existing.recipient_role,
      type: existing.type,
      title: existing.title,
      message: existing.message,
      status: "acknowledged",
      acknowledgedAt: now,
      createdAt: existing.created_at,
    };
  }

  async getNotificationsByCase(caseId: string): Promise<Notification[]> {
    const res = await this.db
      .prepare(
        `SELECT id, case_id as caseId, recipient_id as recipientId, recipient_role as recipientRole,
                type, title, message, status, acknowledged_at as acknowledgedAt, created_at as createdAt
         FROM notifications WHERE case_id = ? ORDER BY created_at DESC`
      )
      .bind(caseId)
      .all<Notification>();

    return res.results || [];
  }
}
