import type { CharacterId } from "./types";

export const characterAssets: Record<
  CharacterId,
  { avatar: string; avatarClassName: string }
> = {
  ruda: {
    avatar: "🎀",
    avatarClassName: "from-[#a1887f] to-[#7d6608]",
  },
  emilia: {
    avatar: "❄️",
    avatarClassName: "from-[#cbd5e1] to-[#a855f7]",
  },
  daon: {
    avatar: "🌌",
    avatarClassName: "from-[#1e3a8a] to-[#0f172a]",
  },
};

export const CHARACTER_IDS = ["ruda", "emilia", "daon"] as const;
