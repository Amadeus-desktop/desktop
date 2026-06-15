import { describe, expect, it } from "vitest";
import { isMainAuthCallbackOwnerSearch } from "./authCallbackOwnership";

describe("authCallbackOwnership", () => {
  it("treats the main window as the auth callback owner", () => {
    expect(isMainAuthCallbackOwnerSearch("")).toBe(true);
    expect(isMainAuthCallbackOwnerSearch("?view=main")).toBe(true);
  });

  it("prevents the companion window from owning auth callbacks", () => {
    expect(isMainAuthCallbackOwnerSearch("?view=companion")).toBe(false);
    expect(isMainAuthCallbackOwnerSearch("?view=companion&foo=bar")).toBe(false);
  });
});
