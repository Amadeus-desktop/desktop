import eirenFantasyGuardian from "./cards/eiren-fantasy-guardian.json";
import makiseKurisu from "./cards/makise-kurisu.json";
import seoyeonModernSenior from "./cards/seoyeon-modern-senior.json";
import type { PersonaStateJson, PersonaStaticPromptJson } from "./sourceOfTruth";
import type { Persona, PersonaId } from "./types";

export type PersonaCard = {
  id: PersonaId;
  name: string;
  baseTone: string;
  relationshipType: string;
  worldType: string;
  version: number;
  marketPosition: Record<string, unknown>;
  staticPromptJson: PersonaStaticPromptJson;
  personaStateSeed: PersonaStateJson;
};

export type PersonaPresentation = {
  relationshipHook: string;
  carePattern: string;
  voiceSample: string;
  recommendedFor: string[];
  headerLine: string;
};

const PERSONA_CARDS: Partial<Record<PersonaId, PersonaCard>> = {
  "seoyeon-modern-senior": seoyeonModernSenior as PersonaCard,
  "eiren-fantasy-guardian": eirenFantasyGuardian as PersonaCard,
  "makise-kurisu": makiseKurisu as PersonaCard,
};

const PERSONA_PRESENTATION: Record<PersonaId, PersonaPresentation> = {
  "seoyeon-modern-senior": {
    relationshipHook: "헤어진 뒤에도 네 작업 리듬을 기억하는 현실적인 선배",
    carePattern: "기다림, 검증된 기억, 짧은 안부, 조용한 보호",
    voiceSample: "늦은 시간이네. 물 한 모금 마실래?",
    recommendedFor: ["야근", "마감", "감정 정리"],
    headerLine: "네 리듬을 조용히 기억하는 선배",
  },
  "eiren-fantasy-guardian": {
    relationshipHook: "저주받은 수호 기사와 맹세의 표식으로 이어진 관계",
    carePattern: "보호, 억눌린 애정, 선택 존중, 금지된 친밀감",
    voiceSample: "검을 내려놓아도 패배는 아니다.",
    recommendedFor: ["긴 작업", "번아웃", "몰입"],
    headerLine: "네 선택을 먼저 두는 수호 기사",
  },
  "makise-kurisu": {
    relationshipHook: "까칠한 천재 연구자와 밤샘 연구실 파트너",
    carePattern: "반박, 근거 요구, 변수 정리, 서툰 걱정",
    voiceSample: "그건 비약이야. 관찰 가능한 사실부터 정리하자.",
    recommendedFor: ["코딩", "디버깅", "자료 분석"],
    headerLine: "연구실 옆자리에서 변수부터 줄이는 중",
  },
};

export function getPersonaCard(persona: Persona): PersonaCard {
  return PERSONA_CARDS[persona.id] ?? buildFallbackPersonaCard(persona);
}

export function getPersonaStaticPrompt(persona: Persona): PersonaStaticPromptJson {
  return getPersonaCard(persona).staticPromptJson;
}

export function getPersonaStateSeed(persona: Persona): PersonaStateJson {
  return getPersonaCard(persona).personaStateSeed;
}

export function getPersonaPresentation(persona: Persona): PersonaPresentation {
  return PERSONA_PRESENTATION[persona.id] ?? {
    relationshipHook: persona.description,
    carePattern: "짧고 낮은 압력의 동행",
    voiceSample: persona.description,
    recommendedFor: [persona.shortLabel],
    headerLine: persona.shortLabel,
  };
}

function buildFallbackPersonaCard(persona: Persona): PersonaCard {
  return {
    id: persona.id,
    name: persona.name,
    baseTone: "gentle",
    relationshipType: "desktop_companion",
    worldType: "modern_desktop",
    version: 1,
    marketPosition: {
      genre_bucket: "desktop_companion",
      relationship_hook: persona.shortLabel,
      care_pattern: "short, low-pressure companion messages",
    },
    staticPromptJson: {
      identity: {
        id: persona.id,
        name: persona.name,
        shortLabel: persona.shortLabel,
        description: persona.description,
      },
      scenario: {
        relationship_hook: persona.shortLabel,
      },
      relationship_boundary: {
        not_allowed: ["claim_hidden_context", "force_dependency"],
      },
      forbidden_claims: [
        "나는 네 화면 전체를 실시간으로 보고 있다",
        "너는 내 말대로 해야 한다",
      ],
      negative_behavior: ["사용자 거절 무시", "감시하는 듯한 표현"],
      safety_boundary: {
        dependency: "사용자가 AI 관계에만 기대도록 만들지 않는다.",
      },
      privacy_contract: {
        desktop_context: "화면 원문을 인용하지 않는다.",
      },
    },
    personaStateSeed: {
      relationship_stage: "desktop_companion",
      affinity: 20,
      trust_state: "stable",
      recent_mood: null,
      open_loops: [],
      last_major_event: null,
      boundary_overrides: {},
      state_source: "system_seed",
      version: 1,
    },
  };
}
