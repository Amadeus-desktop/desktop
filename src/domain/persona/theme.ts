import type { PersonaId } from "./types";

export type PersonaAccent = {
  /** Tailwind gradient stops for avatar / chip fill */
  gradient: string;
  /** Tailwind ring / border tint */
  ring: string;
  /** Tailwind text accent */
  text: string;
  /** Soft glow shadow color (rgb components) */
  glow: string;
};

export const PERSONA_ACCENT: Record<PersonaId, PersonaAccent> = {
  warm_friend: {
    gradient: "from-[#fda4af]/90 to-[#f9a8d4]/75",
    ring: "ring-[#fb7185]/35",
    text: "text-[#fda4af]",
    glow: "251 113 133",
  },
  loving_partner: {
    gradient: "from-[#f472b6]/90 to-[#e879f9]/75",
    ring: "ring-[#f472b6]/35",
    text: "text-[#f9a8d4]",
    glow: "244 114 182",
  },
  fantasy_guardian: {
    gradient: "from-[#a78bfa]/90 to-[#818cf8]/75",
    ring: "ring-[#a78bfa]/35",
    text: "text-[#c4b5fd]",
    glow: "167 139 250",
  },
  quiet_companion: {
    gradient: "from-[#94a3b8]/85 to-[#64748b]/70",
    ring: "ring-[#94a3b8]/30",
    text: "text-[#cbd5e1]",
    glow: "148 163 184",
  },
  minimal_user: {
    gradient: "from-[#d4d4d8]/85 to-[#a1a1aa]/70",
    ring: "ring-white/20",
    text: "text-[#e4e4e7]",
    glow: "212 212 216",
  },
  cute_character: {
    gradient: "from-[#fcd34d]/90 to-[#fb923c]/75",
    ring: "ring-[#fbbf24]/35",
    text: "text-[#fde68a]",
    glow: "251 191 36",
  },
  nature_healing: {
    gradient: "from-[#6ee7b7]/90 to-[#34d399]/75",
    ring: "ring-[#34d399]/35",
    text: "text-[#6ee7b7]",
    glow: "52 211 153",
  },
};

export function getPersonaAccent(personaId: PersonaId): PersonaAccent {
  return PERSONA_ACCENT[personaId];
}
