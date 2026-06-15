import { glassStyles } from "../../ui/glassStyles";
import type { Character } from "./types";

type CharacterCardProps = {
  character: Character;
  selected: boolean;
  onSelect: () => void;
};

export function CharacterCard({
  character,
  selected,
  onSelect,
}: CharacterCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`min-w-0 p-4 text-center transition ${glassStyles.radiusCard} ${
        selected
          ? `${glassStyles.rowSelected} ${glassStyles.panelStrong}`
          : `${glassStyles.row} hover:bg-[#2a2a2e]`
      }`}
    >
      <div
        className={`mx-auto flex size-20 items-center justify-center rounded-[22px] bg-gradient-to-br text-3xl ${character.avatarClassName}`}
      >
        {character.avatar}
      </div>
      <div className="mt-3 truncate text-sm font-semibold text-white">
        {character.name}
      </div>
      <p className="mt-1 min-h-8 text-[11px] leading-4 text-white/45">
        {character.description}
      </p>
    </button>
  );
}
