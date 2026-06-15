import type { CharacterMessages } from "../modules/character";

export const character: CharacterMessages = {
  eyebrow: "Amadeus Persona",
  title: "캐릭터 선택",
  description: "작업 흐름에 맞춰 말투와 반응 강도를 조절하는 동반자 프로필입니다.",
  section: "Character",
  currentMode: "Current Mode",
  currentModeTemplate: "{name} 기준으로 말풍선과 채팅 톤을 맞춥니다.",
  profiles: {
    ruda: {
      name: "루다",
      description: "말괄량이 여동생 텐션",
    },
    emilia: {
      name: "에밀리아",
      description: "은근히 챙겨주는 다정함",
    },
    daon: {
      name: "다온",
      description: "차분하고 묵묵한 위로",
    },
  },
};
