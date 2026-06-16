import { cn } from "../../../lib/utils/cn";
import {
  CHARACTER_AVATAR_ICON,
  CHARACTER_AVATAR_TILE,
  type CharacterAvatarSize,
} from "../../../ui/tokens/avatarSizes";
import { glassStyles, shellText, characterVoicePreviewClass } from "../../../ui/theme/shellStyles";
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
  speechPreviewLabel: string;
  onSelect: () => void;
};

export function CharacterCard({
  character,
  selected,
  activeLabel,
  speechPreviewLabel,
  onSelect,
}: CharacterCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-2.5 px-3.5 py-3 text-left transition",
        glassStyles.radiusCard,
        selected
          ? cn(glassStyles.rowSelected, glassStyles.panelStrong)
          : glassStyles.row,
      )}
      style={
        selected
          ? {
              boxShadow: `0 8px 24px rgb(${character.glow} / 0.14), inset 0 0 0 1px rgb(${character.glow} / 0.22)`,
            }
          : undefined
      }
    >
      <span className="flex items-center gap-3">
        <CharacterAvatar character={character} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={cn("text-sm font-medium", shellText.primary)}>
              {character.name}
            </span>
            {selected ? (
              <span
                className={cn(
                  "rounded-full border border-[color:var(--shell-border-subtle)] bg-[color:var(--shell-row-hover)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  character.accentText,
                )}
              >
                {activeLabel}
              </span>
            ) : null}
          </span>
          <span className={cn("mt-0.5 block text-[12px] leading-5", shellText.muted)}>
            {character.description}
          </span>
        </span>
      </span>

      <div className={characterVoicePreviewClass}>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--character-voice-muted)]">
          {speechPreviewLabel}
        </p>
        <p className="mt-1 text-[12px] leading-[1.6] text-[color:var(--character-voice-ink)]">
          “{character.speechExample}”
        </p>
      </div>
    </button>
  );
}
