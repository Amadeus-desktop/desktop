import { useEffect } from "react";
import { setLocale } from "../../i18n";
import { useAppSettings } from "../../features/settings";
import { applyAccentColor } from "./applyAccentColor";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_APPEARANCE,
  resolveAppearance,
  type AppearanceMode,
} from "../tokens/appearance";
import { applyAppearance } from "./applyAppearance";

export function useShellTheme() {
  const { settings, hydrated } = useAppSettings();

  useEffect(() => {
    if (!hydrated) return;

    setLocale(settings.locale);
    const appearance = settings.appearance ?? DEFAULT_APPEARANCE;
    applyAppearance(appearance);
    applyAccentColor(settings.accentColor ?? DEFAULT_ACCENT_COLOR);

    if (appearance !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      applyAppearance("system");
    }

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [hydrated, settings.accentColor, settings.appearance, settings.locale]);
}

export function useResolvedAppearance(): "dark" | "light" {
  const { settings } = useAppSettings();
  return resolveAppearance(settings.appearance ?? DEFAULT_APPEARANCE);
}

export type { AppearanceMode };
