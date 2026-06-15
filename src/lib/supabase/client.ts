import { createClient } from "@supabase/supabase-js";
import { readSupabasePublicConfig } from "./config";

let cachedClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!cachedClient) {
    const { url, anonKey } = readSupabasePublicConfig();
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
    });
  }
  return cachedClient;
}
