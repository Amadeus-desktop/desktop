import {
  buildPromptMemoryContext,
  rankPromptMemoryCards,
  type MemoryCard,
} from "../../domain/memory/cards";
import type { PersonaId } from "../../domain/persona/types";
import type { Persona } from "../../domain/persona/types";
import {
  buildCompanionPromptEnvelope,
  type CompanionPromptEnvelope,
  type PromptCurrentContext,
  type PromptMode,
} from "../../domain/prompt/assembly";
import type { LocaleCode } from "../../i18n/types";
import type { CompanionMessage } from "../companion/types";

export type LlmChatRole = "assistant" | "user";

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmChatRequest = {
  messages: LlmChatMessage[];
  locale: LocaleCode;
  personaId: PersonaId;
  nickname: string;
  promptEnvelope: CompanionPromptEnvelope;
};

export type LlmGeneration = {
  message: string;
  provider: string;
};

export type LlmProviderHealth = {
  provider: string;
  available: boolean;
  detail: string;
};

export function toLlmChatRequest(
  messages: CompanionMessage[],
  context: {
    locale: LocaleCode;
    personaId: PersonaId;
    nickname: string;
    persona: Persona;
    memoryCards?: MemoryCard[];
    mode?: PromptMode;
    currentContext?: PromptCurrentContext | null;
    nowMs?: number;
  },
): LlmChatRequest {
  const llmMessages: LlmChatMessage[] = messages.map((message) => ({
    role: message.sender === "companion" ? "assistant" : "user",
    content: message.text,
  }));
  const promptMemoryContext = buildPromptMemoryContext(
    rankPromptMemoryCards(context.memoryCards ?? [], {
      nowMs: context.nowMs ?? Date.now(),
      personaId: context.personaId,
      mode: context.mode ?? "deep",
      provider: "local_qwen",
    }),
  );

  return {
    messages: llmMessages,
    locale: context.locale,
    personaId: context.personaId,
    nickname: context.nickname,
    promptEnvelope: buildCompanionPromptEnvelope({
      surface: "app",
      mode: context.mode ?? "deep",
      locale: context.locale,
      isConversationStart: messages.length === 0,
      personaStatic: {
        identity: {
          id: context.persona.id,
          name: context.persona.name,
          shortLabel: context.persona.shortLabel,
          description: context.persona.description,
        },
        scenario: {
          relationship_hook: context.persona.shortLabel,
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
      personaState: null,
      semanticMemories: promptMemoryContext.semanticMemories,
      episodicContext: promptMemoryContext.episodicContext,
      sessionMessages: messages.map((message, index) => ({
        id: message.id,
        role: message.sender === "companion" ? "assistant" : "user",
        content: message.text,
        createdAtMs: index + 1,
        clientSequence: index + 1,
      })),
      currentContext: context.currentContext ?? null,
    }),
  };
}
