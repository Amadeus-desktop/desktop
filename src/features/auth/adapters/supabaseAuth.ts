import type { User } from "@supabase/supabase-js";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "../../../lib/tauri/runtime";
import { getSupabaseClient } from "../../../lib/supabase/client";
import type { AuthUser } from "../types";

type SupabaseUserLike = Pick<User, "id" | "email" | "app_metadata" | "user_metadata">;

export const AMADEUS_AUTH_CALLBACK_URL = "amadeus://auth/callback";
export const AMADEUS_DEV_AUTH_CALLBACK_URL = "http://127.0.0.1:17421/auth/callback";
export const AMADEUS_DEV_AUTH_CALLBACK_PORT = "17421";
export const AMADEUS_AUTH_CALLBACK_EVENT = "amadeus-auth-callback";

export function toAuthUser(user: SupabaseUserLike): AuthUser {
  const name =
    stringMetadata(user.user_metadata.name) ||
    stringMetadata(user.user_metadata.full_name) ||
    user.email ||
    "Amadeus User";
  const avatarUrl =
    stringMetadata(user.user_metadata.avatar_url) ||
    stringMetadata(user.user_metadata.picture) ||
    undefined;

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    provider: "google",
    avatarUrl,
  };
}

export async function getCurrentSupabaseUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return toAuthUser(data.user);
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const shouldOpenExternalBrowser = isTauriRuntime();
  const redirectTo = await resolveGoogleOAuthRedirectUrl(shouldOpenExternalBrowser);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: shouldOpenExternalBrowser,
    },
  });
  if (error) {
    throw error;
  }

  if (shouldOpenExternalBrowser) {
    if (!data.url) {
      throw new Error("Supabase did not return an OAuth redirect URL");
    }
    await openUrl(data.url);
    return null;
  }

  return getCurrentSupabaseUser();
}

export function getGoogleOAuthRedirectUrl(
  shouldUseAppDeepLink = isTauriRuntime(),
  origin = typeof window === "undefined" ? "" : window.location.origin,
) {
  if (!shouldUseAppDeepLink) return origin;
  return isLocalDevOrigin(origin) ? AMADEUS_DEV_AUTH_CALLBACK_URL : AMADEUS_AUTH_CALLBACK_URL;
}

async function resolveGoogleOAuthRedirectUrl(shouldUseAppDeepLink: boolean) {
  const redirectUrl = getGoogleOAuthRedirectUrl(shouldUseAppDeepLink);
  if (redirectUrl !== AMADEUS_DEV_AUTH_CALLBACK_URL) return redirectUrl;

  return invoke<string>("start_dev_auth_callback_server");
}

export async function ensureDevAuthCallbackServer(): Promise<void> {
  if (!isTauriRuntime()) return;

  const redirectUrl = getGoogleOAuthRedirectUrl(true);
  if (redirectUrl !== AMADEUS_DEV_AUTH_CALLBACK_URL) return;

  await invoke<string>("start_dev_auth_callback_server");
}

export async function consumePendingAuthCallback(): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  const payload = await invoke<{ url?: string } | null>("consume_pending_auth_callback");
  return typeof payload?.url === "string" ? payload.url : null;
}

export function extractAuthCallbackCode(callbackUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    return null;
  }

  if (!isSupportedAuthCallbackUrl(parsed)) return null;

  const code = parsed.searchParams.get("code");
  return code && code.trim() ? code : null;
}

function isSupportedAuthCallbackUrl(parsed: URL) {
  const isAmadeusAuthCallback =
    parsed.protocol === "amadeus:" &&
    parsed.hostname === "auth" &&
    parsed.pathname === "/callback";
  const isDevLoopbackCallback =
    (parsed.protocol === "http:" || parsed.protocol === "https:") &&
    (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") &&
    parsed.port === AMADEUS_DEV_AUTH_CALLBACK_PORT &&
    parsed.pathname === "/auth/callback";

  return isAmadeusAuthCallback || isDevLoopbackCallback;
}

function isLocalDevOrigin(origin: string) {
  if (!origin) return false;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "tauri:") return false;

    const isLoopbackHost =
      parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";

    if (isLoopbackHost) {
      return parsed.port === "1420" || parsed.port === "1421" || parsed.port === "";
    }

    return parsed.hostname === "tauri.localhost";
  } catch {
    return false;
  }
}

export async function completeSupabaseAuthCallback(callbackUrl: string) {
  const code = extractAuthCallbackCode(callbackUrl);
  if (!code) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    throw error;
  }
  if (data.user) {
    return toAuthUser(data.user);
  }
  return getCurrentSupabaseUser();
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

function stringMetadata(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
