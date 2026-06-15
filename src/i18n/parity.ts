import { locale as en } from "./en";
import { locale as ja } from "./ja";
import { locale as ko } from "./ko";
import type { LocaleCode } from "./types";

const locales: Record<LocaleCode, unknown> = { ko, en, ja };

function collectKeyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      return collectKeyPaths(nested, nextPrefix);
    }
    return [nextPrefix];
  });
}

export function assertLocaleKeyParity(): void {
  const reference = collectKeyPaths(locales.ko).sort();
  const mismatches: string[] = [];

  for (const [code, bundle] of Object.entries(locales) as Array<
    [LocaleCode, unknown]
  >) {
    if (code === "ko") continue;

    const keys = collectKeyPaths(bundle).sort();
    const missing = reference.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !reference.includes(key));

    if (missing.length > 0 || extra.length > 0) {
      mismatches.push(
        `${code}: missing=[${missing.join(", ")}] extra=[${extra.join(", ")}]`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`i18n locale key parity failed:\n${mismatches.join("\n")}`);
  }
}

export function getLocaleKeyPaths(locale: LocaleCode = "ko"): string[] {
  return collectKeyPaths(locales[locale]).sort();
}
