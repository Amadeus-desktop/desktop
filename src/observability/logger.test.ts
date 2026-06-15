import { describe, expect, it } from "vitest";
import { redactLogValue } from "./logger";

describe("redactLogValue", () => {
  it("redacts secrets, urls, and file paths", () => {
    const redacted = redactLogValue(
      "opened /Users/user/private/report.pdf and https://example.com?a=1&token=abc with password=secret",
    );

    expect(redacted).not.toContain("/Users/user");
    expect(redacted).not.toContain("https://example.com");
    expect(redacted).not.toContain("token=abc");
    expect(redacted).not.toContain("password=secret");
    expect(redacted).toContain("[redacted-path]");
    expect(redacted).toContain("[redacted-secret]");
  });
});
