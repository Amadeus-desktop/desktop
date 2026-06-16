import { PanelHeader } from "../../../ui";
import { cn } from "../../../lib/utils/cn";
import { shellText } from "../../../ui/theme/shellStyles";
import { useI18n } from "../../../i18n";
import { getPersonaList } from "../../../domain/persona";
import { CharacterCard } from "./CharacterCard";
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
      speechExample: persona.speechExample ?? "",
      ...visual,
    };
  });

  return (
    <section className="motion-safe-animate animate-tab-panel-enter space-y-5">
      <PanelHeader
        eyebrow={t.character.eyebrow}
        title={t.character.title}
        description={t.character.description}
      />

      <div className="space-y-2">
        <p className={cn("px-0.5 text-[10px] font-semibold uppercase tracking-wide", shellText.faint)}>
          {t.character.section}
        </p>
        <div className="flex flex-col gap-2">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              selected={character.id === selectedCharacterId}
              activeLabel="ON"
              speechPreviewLabel={t.character.speechPreview}
              onSelect={() => selectCharacter(character.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
