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
};

export function getPersonaAccent(personaId: PersonaId): PersonaAccent {
  return PERSONA_ACCENT[personaId];
}
