import { describe, expect, it } from "vitest";
import { resolveAdminApiBaseUrl, shouldUseAdminDemoData } from "../../../Member 3/src/services/config";

describe("Member 3 admin connection defaults", () => {
  it("keeps standalone admin mode when no backend is configured", () => {
    expect(shouldUseAdminDemoData(undefined, undefined, undefined)).toBe(true);
    expect(resolveAdminApiBaseUrl(undefined, undefined)).toBe("");
  });
  it("inherits Member 1's connected API origin automatically", () => {
    expect(shouldUseAdminDemoData(undefined, undefined, "http://localhost:8787/api")).toBe(false);
    expect(resolveAdminApiBaseUrl(undefined, "http://localhost:8787/api")).toBe("http://localhost:8787");
    expect(resolveAdminApiBaseUrl(undefined, "https://example.test/api/")).toBe("https://example.test");
  });
  it("honors an explicit Member 3 override", () => {
    expect(shouldUseAdminDemoData("true", "https://api.example.test", "http://localhost:8787/api")).toBe(true);
    expect(shouldUseAdminDemoData("false")).toBe(false);
    expect(resolveAdminApiBaseUrl("https://api.example.test/", "http://localhost:8787/api")).toBe("https://api.example.test");
  });
});
