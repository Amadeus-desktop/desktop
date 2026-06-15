export type PersonaId = "warm_friend" | "fantasy_guardian";

export type Persona = {
  id: PersonaId;
  name: string;
  shortLabel: string;
  description: string;
};

export const PERSONA_IDS = ["warm_friend", "fantasy_guardian"] as const satisfies readonly PersonaId[];
