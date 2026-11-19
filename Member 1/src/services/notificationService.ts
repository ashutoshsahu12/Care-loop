import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, notifications } from "../mocks/data";
import type { CareNotification, Role } from "../types";
import { BACKEND_DEMO_PATIENT_REF, getAllCaseDetails, getPatientSummary, visibleCaseDetails } from "./backendBridge";
type BackendNotification = { id: string; caseId?: string | null; title: string; message: string; createdAt: string; status: string; acknowledgedAt?: string | null };
export function mapConnectedNotification(
  item: BackendNotification, role?: Role, patientId?: string
): CareNotification {
  return {
    id: item.id, caseId: item.caseId ?? undefined,
    patientId: role === "patient" ? (patientId || BACKEND_DEMO_PATIENT_REF) : undefined,
    title: item.title, description: item.message, time: item.createdAt,
    createdAt: item.createdAt, unread: item.status !== "acknowledged",
    acknowledgedAt: item.acknowledgedAt, tone: "blue",
  };
}

export const notificationService = {
  async list(role?: Role, patientId?: string): Promise<CareNotification[]> {
    if (!isDemoMode) {
      const raw = role === "patient"
        ? (await getPatientSummary(patientId || BACKEND_DEMO_PATIENT_REF)).unreadNotifications.map(item => ({ ...item, acknowledgedAt: undefined }))
        : (await Promise.all(visibleCaseDetails(await getAllCaseDetails(), role, patientId).map(async detail =>
            (await api.get<BackendNotification[]>(`/cases/${encodeURIComponent(detail.caseRecord.id)}/notifications`)).data
          ))).flat();
      return raw.map(item => mapConnectedNotification(item, role, patientId));
    }
    return role === "patient" ? patientId === DEMO_PATIENT_ID ? notifications.filter((item) => item.patientId === patientId) : [] : notifications.filter((item) => !item.patientId);
  },
  async setRead(id: number | string, read: boolean): Promise<void> {
    if (!isDemoMode) {
      if (!read) throw new Error("Acknowledged care notifications cannot be marked unread.");
      await api.post(`/notifications/${encodeURIComponent(String(id))}/acknowledge`, {});
      return;
    }
    const item = notifications.find((notification) => notification.id === id);
    if (!item) throw new Error("Notification was not found.");
    item.unread = !read;
  },
  async markAllRead(role?: Role, patientId?: string): Promise<void> {
    if (!isDemoMode) {
      const items = await notificationService.list(role, patientId);
      await Promise.all(items.filter(item => item.unread).map(item => api.post(`/notifications/${encodeURIComponent(String(item.id))}/acknowledge`, {})));
      return;
    }
    const visible = role === "patient" ? patientId === DEMO_PATIENT_ID ? notifications.filter((item) => item.patientId === patientId) : [] : notifications.filter((item) => !item.patientId);
    visible.forEach((item) => { item.unread = false; });
  },
};
