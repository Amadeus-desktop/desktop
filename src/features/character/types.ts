import type { IconType } from "react-icons";

export type CharacterId = "ruda" | "emilia" | "daon";

export type Character = {
  id: CharacterId;
  name: string;
  description: string;
  icon: IconType;
  gradient: string;
  glow: string;
  accentText: string;
};
