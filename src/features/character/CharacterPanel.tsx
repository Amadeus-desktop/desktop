import { SectionHeading } from "../../ui/SectionHeading";
import { StatusPill } from "../../ui/StatusPill";
import { CharacterCard } from "./CharacterCard";
import { characters } from "./characters";
import { useCharacterSelection } from "./useCharacterSelection";

export function CharacterPanel() {
  const { selectedCharacterId, selectCharacter } = useCharacterSelection();
  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ??
    characters[0];

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">Amadeus Persona</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          캐릭터 선택
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          작업 흐름에 맞춰 말투와 반응 강도를 조절하는 동반자 프로필입니다.
        </p>
      </header>

      <SectionHeading>Character</SectionHeading>
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

      <SectionHeading>Current Mode</SectionHeading>
      <StatusPill tone="purple">
        {selectedCharacter.name} 기준으로 말풍선과 채팅 톤을 맞춥니다.
      </StatusPill>
    </section>
  );
}
