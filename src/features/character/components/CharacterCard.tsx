import type { Character } from "../model/types";

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
      className={`min-w-0 rounded-lg border p-4 text-center transition ${
        selected
          ? "border-[#007aff] bg-[#007aff]/12"
          : "border-white/6 bg-white/[0.03] hover:border-white/14 hover:bg-white/[0.06]"
      }`}
    >
      <div
        className={`mx-auto flex size-20 items-center justify-center rounded-full bg-gradient-to-br text-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] ${character.avatarClassName}`}
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
