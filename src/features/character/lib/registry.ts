import type { IconType } from "react-icons";
import { GiRibbon } from "react-icons/gi";
import { TbSnowflake, TbStars } from "react-icons/tb";
import { PERSONA_IDS, normalizePersonaId } from "../../../domain/persona";
import type { CharacterId } from "../types";

export const CHARACTER_IDS = PERSONA_IDS;

export type CharacterVisual = {
  icon: IconType;
  gradient: string;
  glow: string;
  accentText: string;
};

export const CHARACTER_VISUALS: Record<CharacterId, CharacterVisual> = {
  "seoyeon-modern-senior": {
    icon: GiRibbon,
    gradient: "from-[#9a6b55] to-[#c9a227]",
    glow: "201 162 39",
    accentText: "text-[#f0c674]",
  },
  "eiren-fantasy-guardian": {
    icon: TbSnowflake,
    gradient: "from-[#94a3b8] to-[#a855f7]",
    glow: "168 85 247",
    accentText: "text-[#c4b5fd]",
  },
  "makise-kurisu": {
    icon: TbStars,
    gradient: "from-[#1e40af] to-[#0f172a]",
    glow: "59 130 246",
    accentText: "text-[#93c5fd]",
  },
};

export function getCharacterVisual(id: CharacterId): CharacterVisual {
  return CHARACTER_VISUALS[id];
}

export function normalizeCharacterId(value: unknown): CharacterId {
  return normalizePersonaId(String(value));
}
