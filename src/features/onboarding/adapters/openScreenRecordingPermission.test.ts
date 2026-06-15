import { describe, expect, it, vi } from "vitest";
import { ensureScreenCapturePermissionWithDependencies } from "./openScreenRecordingPermission";

describe("ensureScreenCapturePermission", () => {
  it("returns false when opening Screen Recording settings fails", async () => {
    await expect(
      ensureScreenCapturePermissionWithDependencies({
        getStatus: vi.fn(),
        openSettings: vi.fn().mockRejectedValue(new Error("blocked by opener scope")),
        requestPermission: vi.fn().mockResolvedValue({
          platform: "macos",
          granted: false,
          canRequest: true,
        }),
        sleep: vi.fn(),
        pollAttempts: 0,
      }),
    ).resolves.toBe(false);
  });
});
