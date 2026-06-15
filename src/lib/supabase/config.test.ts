import { describe, expect, it } from "vitest";
import { readSupabasePublicConfig } from "./config";

describe("readSupabasePublicConfig", () => {
  it("uses only public Supabase url and anon or publishable key", () => {
    const config = readSupabasePublicConfig({
      PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      PUBLIC_SUPABASE_ACCESS_TOKEN: "must-not-be-used",
    });

    expect(config).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("falls back to publishable key when anon key is absent", () => {
    const config = readSupabasePublicConfig({
      PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
    });

    expect(config.anonKey).toBe("publishable-key");
  });
});
