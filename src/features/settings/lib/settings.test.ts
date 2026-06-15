import { describe, expect, it } from "vitest";
import { initialSettings, normalizeGeneralSettings } from "./settings";

describe("normalizeGeneralSettings", () => {
  it("maps legacy persona ids to supported ids", () => {
    const settings = normalizeGeneralSettings({
      companionPersonaId: "nature_healing" as typeof initialSettings.companionPersonaId,
    });

    expect(settings.companionPersonaId).toBe("soft_care");
  });

  it("falls back invalid appearance and accent values to defaults", () => {
    const settings = normalizeGeneralSettings({
      appearance: "sepia" as typeof initialSettings.appearance,
      accentColor: "neon" as typeof initialSettings.accentColor,
    });

    expect(settings.appearance).toBe(initialSettings.appearance);
    expect(settings.accentColor).toBe(initialSettings.accentColor);
  });

  it("keeps legacy accentTheme when accentColor is missing", () => {
    const settings = normalizeGeneralSettings({
      accentColor: undefined,
      accentTheme: "mint",
    });

    expect(settings.accentColor).toBe("mint");
  });

  it("falls back invalid character ids to emilia", () => {
    const settings = normalizeGeneralSettings({
      characterId: "unknown" as typeof initialSettings.characterId,
    });

    expect(settings.characterId).toBe("emilia");
  });
});
