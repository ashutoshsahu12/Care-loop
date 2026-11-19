import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { getAllCaseDetails, invalidateCaseDetailsCache } from "./backendBridge";

afterEach(() => {
  invalidateCaseDetailsCache();
  vi.restoreAllMocks();
});

describe("shared connected case snapshots", () => {
  it("deduplicates parallel case-list requests from independent service screens", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] } as never);
    const [a, b, c] = await Promise.all([
      getAllCaseDetails(), getAllCaseDetails(), getAllCaseDetails(),
    ]);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
    expect(c).toEqual([]);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("re-queries after a mutation invalidates the snapshot", async () => {
    const get = vi.spyOn(api, "get").mockResolvedValue({ data: [] } as never);
    await getAllCaseDetails();
    await getAllCaseDetails();
    expect(get).toHaveBeenCalledTimes(1);
    invalidateCaseDetailsCache();
    await getAllCaseDetails();
    expect(get).toHaveBeenCalledTimes(2);
  });
});
