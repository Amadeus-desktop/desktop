import { cn } from "../../../lib/utils/cn";
import {
  CHARACTER_AVATAR_ICON,
  CHARACTER_AVATAR_TILE,
  type CharacterAvatarSize,
} from "../../../ui/tokens/avatarSizes";
import { glassStyles } from "../../../ui";
import type { Character } from "../types";

type CharacterAvatarProps = {
  character: Pick<Character, "icon" | "gradient">;
  size?: CharacterAvatarSize;
  className?: string;
};

export function CharacterAvatar({
  character,
  size = "md",
  className,
}: CharacterAvatarProps) {
  const Icon = character.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255_/_0.12)]",
        CHARACTER_AVATAR_TILE[size],
        character.gradient,
        className,
      )}
    >
      <Icon className={CHARACTER_AVATAR_ICON[size]} aria-hidden="true" />
    </span>
  );
}

type CharacterCardProps = {
  character: Character;
  selected: boolean;
  activeLabel: string;
  onSelect: () => void;
};

export function CharacterCard({
  character,
  selected,
  activeLabel,
  onSelect,
}: CharacterCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-3 text-left transition",
        glassStyles.radiusCard,
        selected
          ? `${glassStyles.rowSelected} ${glassStyles.panelStrong}`
          : `${glassStyles.row} hover:bg-[#2a2a2e]`,
      )}
      style={
        selected
          ? {
              boxShadow: `0 8px 24px rgb(${character.glow} / 0.14), inset 0 0 0 1px rgb(${character.glow} / 0.22)`,
            }
          : undefined
      }
    >
      <CharacterAvatar character={character} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{character.name}</span>
          {selected ? (
            <span
              className={cn(
                "rounded-full bg-[#2a2a2e] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                character.accentText,
              )}
            >
              {activeLabel}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[12px] leading-5 text-white/55">
          {character.description}
        </span>
      </span>
    </button>
  );
}
