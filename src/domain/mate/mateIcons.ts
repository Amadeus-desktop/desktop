import type { PresenceIconKind } from "../persona/types";

/** HUD presence icon variants — visual only, no LLM/persona effect. */
export const MATE_ICON_KINDS = ["bubble", "letter", "star", "orb"] as const satisfies readonly PresenceIconKind[];

export type MateIconKind = (typeof MATE_ICON_KINDS)[number];

export function isMateIconKind(value: string): value is MateIconKind {
  return (MATE_ICON_KINDS as readonly string[]).includes(value);
}

export function normalizeMateIconKind(value: string): MateIconKind {
  if (isMateIconKind(value)) {
    return value;
  }

  const legacyMap: Record<string, MateIconKind> = {
    line: "bubble",
    face: "bubble",
    leaf: "orb",
  };

  return legacyMap[value] ?? "bubble";
}
