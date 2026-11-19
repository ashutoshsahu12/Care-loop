/// <reference path="../../../types/env.d.ts" />
import { apiRequest } from "../../../services/api";
import { shouldUseAdminDemoData } from "../../../services/config";
import type {
  AdminAnalytics,
  AdminOverview,
  AtRiskCase,
  CaseFilters,
  CaseRecord,
  EscalationRecord,
} from "../../../types/admin";
import {
  demoAnalytics,
  demoAtRiskCases,
  demoCases,
  demoEscalations,
  demoOverview,
} from "./demoData";

/**
 * Demo mode is enabled by default so the Member 3 UI can be developed and
 * demonstrated before Member 2's API is ready.
 *
 * Set VITE_CARELOOP_USE_DEMO_DATA=false in the host Vite app to use the API.
 */
const USE_DEMO_DATA = shouldUseAdminDemoData(
  import.meta.env.VITE_CARELOOP_USE_DEMO_DATA,
  import.meta.env.VITE_CARELOOP_API_URL,
  import.meta.env.VITE_API_BASE_URL,
);

function buildQuery(filters: CaseFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.assignedCareWorker && filters.assignedCareWorker !== "all") {
    params.set("assignedCareWorker", filters.assignedCareWorker);
  }
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  const query = params.toString();
  return query ? `?${query}` : "";
}

function filterDemoCases(filters: CaseFilters = {}): CaseRecord[] {
  const search = filters.search?.trim().toLowerCase();

  return demoCases.filter((record) => {
    const matchesStatus = !filters.status || filters.status === "all" || record.status === filters.status;
    const matchesPriority = !filters.priority || filters.priority === "all" || record.priority === filters.priority;
    const matchesWorker =
      !filters.assignedCareWorker ||
      filters.assignedCareWorker === "all" ||
      (filters.assignedCareWorker === "unassigned"
        ? record.assignedCareWorker === null
        : record.assignedCareWorker === filters.assignedCareWorker);
    const matchesSearch =
      !search ||
      record.patientReference.toLowerCase().includes(search) ||
      record.id.toLowerCase().includes(search) ||
      record.nextAction.toLowerCase().includes(search) ||
      (record.assignedCareWorker ?? "").toLowerCase().includes(search);

    return matchesStatus && matchesPriority && matchesWorker && matchesSearch;
  });
}

const waitForDemo = async <T,>(data: T): Promise<T> => {
  await new Promise((resolve) => window.setTimeout(resolve, 180));
  return data;
};

export const adminService = {
  getOverview: (): Promise<AdminOverview> =>
    USE_DEMO_DATA ? waitForDemo(demoOverview) : apiRequest("/api/admin/overview"),

  getCases: (filters?: CaseFilters): Promise<CaseRecord[]> =>
    USE_DEMO_DATA
      ? waitForDemo(filterDemoCases(filters))
      : apiRequest(`/api/admin/cases${buildQuery(filters)}`),

  getEscalations: (): Promise<EscalationRecord[]> =>
    USE_DEMO_DATA ? waitForDemo(demoEscalations) : apiRequest("/api/admin/escalations"),

  getAtRiskCases: (): Promise<AtRiskCase[]> =>
    USE_DEMO_DATA ? waitForDemo(demoAtRiskCases) : apiRequest("/api/admin/at-risk"),

  getAnalytics: (): Promise<AdminAnalytics> =>
    USE_DEMO_DATA ? waitForDemo(demoAnalytics) : apiRequest("/api/admin/analytics"),

  isDemoMode: (): boolean => USE_DEMO_DATA,
};
