import { PanelHeader } from "../../../ui";
import { useI18n } from "../../../i18n";
import { getPersonaList } from "../../../domain/persona";
import { CharacterAvatar, CharacterCard } from "./CharacterCard";
import { getCharacterVisual } from "../lib/registry";
import { useCharacterSelection } from "../hooks/useCharacterSelection";
import type { Character } from "../types";

export function CharacterPanel() {
  const t = useI18n();
  const { selectedCharacterId, selectCharacter } = useCharacterSelection();
  const characters: Character[] = getPersonaList(t).map((persona) => {
    const visual = getCharacterVisual(persona.id);
    return {
      id: persona.id,
      name: persona.name,
      description: persona.description,
      ...visual,
    };
  });
  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ??
    characters[0];

  return (
    <section className="motion-safe-animate animate-tab-panel-enter space-y-5">
      <PanelHeader
        eyebrow={t.character.eyebrow}
        title={t.character.title}
        description={t.character.description}
      />

      <div className="space-y-2">
        <p className="px-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/35">
          {t.character.section}
        </p>
        <div className="flex flex-col gap-2">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              selected={character.id === selectedCharacterId}
              activeLabel="ON"
              onSelect={() => selectCharacter(character.id)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-[18px] border border-[#333338] bg-[#222226] px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
          {t.character.currentMode}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <CharacterAvatar character={selectedCharacter} size="sm" />
          <p className="min-w-0 text-[13px] leading-5 text-white/70">
            {t.character.currentModeTemplate.replace(
              "{name}",
              selectedCharacter.name,
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
