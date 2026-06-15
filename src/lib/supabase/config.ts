type SupabasePublicEnv = Partial<Record<string, string>>;

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function readSupabasePublicConfig(
  env: SupabasePublicEnv = import.meta.env,
): SupabasePublicConfig {
  const url = env.PUBLIC_SUPABASE_URL?.trim();
  const anonKey =
    env.PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    env.PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error("Supabase public URL and anon/publishable key are required");
  }

  return { url, anonKey };
}
