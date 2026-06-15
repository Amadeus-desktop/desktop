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

const PERSONA_CARDS: Partial<Record<PersonaId, PersonaCard>> = {
  "seoyeon-modern-senior": seoyeonModernSenior as PersonaCard,
  "eiren-fantasy-guardian": eirenFantasyGuardian as PersonaCard,
  "makise-kurisu": makiseKurisu as PersonaCard,
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
