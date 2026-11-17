import { apiRequest } from "../../../services/api";
import type {
  AdminAnalytics,
  AdminOverview,
  AtRiskCase,
  CaseFilters,
  CaseRecord,
  EscalationRecord,
} from "../../../types/admin";

function buildQuery(filters: CaseFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    params.set("priority", filters.priority);
  }
  if (filters.assignedCareWorker && filters.assignedCareWorker !== "all") {
    params.set("assignedCareWorker", filters.assignedCareWorker);
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export const adminService = {
  getOverview: () =>
    apiRequest<AdminOverview>("/api/admin/overview"),

  getCases: (filters?: CaseFilters) =>
    apiRequest<CaseRecord[]>(`/api/admin/cases${buildQuery(filters)}`),

  getEscalations: () =>
    apiRequest<EscalationRecord[]>("/api/admin/escalations"),

  getAtRiskCases: () =>
    apiRequest<AtRiskCase[]>("/api/admin/at-risk"),

  getAnalytics: () =>
    apiRequest<AdminAnalytics>("/api/admin/analytics"),
};
