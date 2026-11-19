import { api, isDemoMode } from "./api";
import { DEMO_PATIENT_ID, notifications } from "../mocks/data";
import type { CareNotification, Role } from "../types";
export const notificationService = {
  async list(role?: Role, patientId?: string): Promise<CareNotification[]> {
    if (!isDemoMode) return (await api.get<CareNotification[]>(role === "patient" ? "/notifications/me" : "/notifications")).data;
    return role === "patient" ? patientId === DEMO_PATIENT_ID ? notifications.filter((item) => item.patientId === patientId) : [] : notifications.filter((item) => !item.patientId);
  },
  async setRead(id: number | string, read: boolean): Promise<void> {
    if (!isDemoMode) {
      await api.patch(`/notifications/${id}`, { read });
      return;
    }
    const item = notifications.find((notification) => notification.id === id);
    if (!item) throw new Error("Notification was not found.");
    item.unread = !read;
  },
  async markAllRead(role?: Role, patientId?: string): Promise<void> {
    if (!isDemoMode) {
      await api.post(role === "patient" ? "/notifications/me/read-all" : "/notifications/read-all");
      return;
    }
    const visible = role === "patient" ? patientId === DEMO_PATIENT_ID ? notifications.filter((item) => item.patientId === patientId) : [] : notifications.filter((item) => !item.patientId);
    visible.forEach((item) => { item.unread = false; });
  },
};
