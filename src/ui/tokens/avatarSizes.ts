export type AvatarTileSize = "sm" | "md" | "lg" | "fab";

export type CharacterAvatarSize = "sm" | "md";

export type PresenceIconSize = "sm" | "md" | "lg" | "fab";

export const CHARACTER_AVATAR_TILE: Record<CharacterAvatarSize, string> = {
  sm: "size-9 rounded-[12px]",
  md: "size-11 rounded-[14px]",
} as const;

export const CHARACTER_AVATAR_ICON: Record<CharacterAvatarSize, string> = {
  sm: "size-4",
  md: "size-5",
} as const;

export const PRESENCE_ICON_TILE: Record<PresenceIconSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-11",
  fab: "size-full",
} as const;

export const PRESENCE_GLYPH_ICON: Record<PresenceIconSize, string> = {
  sm: "size-3.5",
  md: "size-4.5",
  lg: "size-5",
  fab: "size-[1.125rem]",
} as const;
