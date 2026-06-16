import type { IconType } from "react-icons";
import type { PersonaId } from "../../domain/persona";

export type CharacterId = PersonaId;

export type Character = {
  id: CharacterId;
  name: string;
  description: string;
  speechExample: string;
  icon: IconType;
  gradient: string;
  glow: string;
  accentText: string;
};
