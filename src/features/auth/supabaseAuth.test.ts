import { describe, expect, it } from "vitest";
import {
  AMADEUS_AUTH_CALLBACK_URL,
  extractAuthCallbackCode,
  getGoogleOAuthRedirectUrl,
  toAuthUser,
} from "./supabaseAuth";

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

  it("uses the local loopback callback for Tauri dev OAuth", () => {
    expect(getGoogleOAuthRedirectUrl(true, "http://localhost:1420")).toBe(
      "http://127.0.0.1:1421/auth/callback",
    );
  });

  it("uses the app deep link callback for Tauri production OAuth", () => {
    expect(getGoogleOAuthRedirectUrl(true, "tauri://localhost")).toBe(
      AMADEUS_AUTH_CALLBACK_URL,
    );
  });

  it("keeps the browser origin for non-Tauri OAuth", () => {
    expect(getGoogleOAuthRedirectUrl(false, "http://localhost:1420")).toBe(
      "http://localhost:1420",
    );
  });

  it("extracts the PKCE code from the Amadeus auth deep link", () => {
    expect(extractAuthCallbackCode("amadeus://auth/callback?code=oauth-code")).toBe(
      "oauth-code",
    );
  });

  it("extracts the PKCE code from the local dev loopback callback", () => {
    expect(
      extractAuthCallbackCode("http://127.0.0.1:1421/auth/callback?code=oauth-code"),
    ).toBe("oauth-code");
  });

  it("ignores non-auth deep links", () => {
    expect(extractAuthCallbackCode("amadeus://settings/callback?code=oauth-code")).toBeNull();
    expect(extractAuthCallbackCode("http://localhost:1420?code=oauth-code")).toBeNull();
  });
});
