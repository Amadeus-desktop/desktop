import type { PersonaId } from "./types";

export type PersonaAccent = {
  gradient: string;
  ring: string;
  text: string;
  glow: string;
};

export const PERSONA_ACCENT: Record<PersonaId, PersonaAccent> = {
  "seoyeon-modern-senior": {
    gradient: "from-[#fb7185]/90 to-[#f59e0b]/70",
    ring: "ring-[#fb7185]/35",
    text: "text-[#fda4af]",
    glow: "251 113 133",
  },
  "eiren-fantasy-guardian": {
    gradient: "from-[#38bdf8]/90 to-[#64748b]/80",
    ring: "ring-[#38bdf8]/35",
    text: "text-[#7dd3fc]",
    glow: "56 189 248",
  },
  "makise-kurisu": {
    gradient: "from-[#f97316]/90 to-[#14b8a6]/75",
    ring: "ring-[#14b8a6]/35",
    text: "text-[#2dd4bf]",
    glow: "20 184 166",
  },
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
  steady_ally: {
    gradient: "from-[#93c5fd]/90 to-[#818cf8]/75",
    ring: "ring-[#93c5fd]/35",
    text: "text-[#bfdbfe]",
    glow: "147 197 253",
  },
  soft_care: {
    gradient: "from-[#a7f3d0]/90 to-[#6ee7b7]/75",
    ring: "ring-[#6ee7b7]/35",
    text: "text-[#a7f3d0]",
    glow: "110 231 183",
  },
};

export function getPersonaAccent(personaId: PersonaId): PersonaAccent {
  return PERSONA_ACCENT[personaId];
}
