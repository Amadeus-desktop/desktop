import { PanelHeader, SectionHeading, StatusPill } from "../../ui";
import { useI18n } from "../../i18n";
import { CharacterCard } from "./CharacterCard";
import { CHARACTER_IDS, characterAssets } from "./characters";
import { useCharacterSelection } from "./useCharacterSelection";
import type { Character } from "./types";

export function CharacterPanel() {
  const t = useI18n();
  const { selectedCharacterId, selectCharacter } = useCharacterSelection();
  const characters: Character[] = CHARACTER_IDS.map((id) => ({
    id,
    ...characterAssets[id],
    ...t.character.profiles[id],
  }));
  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ??
    characters[0];

  return (
    <section className="tab-panel-enter">
      <PanelHeader
        eyebrow={t.character.eyebrow}
        title={t.character.title}
        description={t.character.description}
      />

      <SectionHeading>{t.character.section}</SectionHeading>
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            selected={character.id === selectedCharacterId}
            onSelect={() => selectCharacter(character.id)}
          />
        ))}
      </div>

      <SectionHeading>{t.character.currentMode}</SectionHeading>
      <StatusPill tone="purple">
        {t.character.currentModeTemplate.replace(
          "{name}",
          selectedCharacter.name,
        )}
      </StatusPill>
    </section>
  );
}
