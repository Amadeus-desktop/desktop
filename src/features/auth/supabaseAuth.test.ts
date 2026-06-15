import { describe, expect, it } from "vitest";
import { toAuthUser } from "./supabaseAuth";

describe("toAuthUser", () => {
  it("maps a Supabase Google user into AuthUser", () => {
    const user = toAuthUser({
      id: "user-1",
      email: "user@example.com",
      app_metadata: { provider: "google" },
      user_metadata: {
        name: "Amadeus User",
        avatar_url: "https://example.com/avatar.png",
      },
    });

    expect(user).toEqual({
      id: "user-1",
      email: "user@example.com",
      name: "Amadeus User",
      provider: "google",
      avatarUrl: "https://example.com/avatar.png",
    });
  });
});
