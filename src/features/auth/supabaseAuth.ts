import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "../../lib/supabase/client";
import type { AuthUser } from "./types";

type SupabaseUserLike = Pick<User, "id" | "email" | "app_metadata" | "user_metadata">;

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
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    throw error;
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
