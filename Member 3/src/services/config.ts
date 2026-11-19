/** Shared backend settings for standalone Member 3 and the Member 1 host app. */
export function resolveAdminApiBaseUrl(adminBase?: string, frontendBase?: string): string {
  const explicit = adminBase?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const fromFrontend = frontendBase?.trim();
  if (!fromFrontend) return "";
  return fromFrontend.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function shouldUseAdminDemoData(
  setting?: string,
  adminBase?: string,
  frontendBase?: string,
): boolean {
  if (setting === "true") return true;
  if (setting === "false") return false;
  return !Boolean(adminBase?.trim() || frontendBase?.trim());
}
