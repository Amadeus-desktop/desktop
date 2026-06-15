import {
  buildPromptMemoryContext,
  rankPromptMemoryCards,
  type MemoryCard,
} from "../../domain/memory/cards";
import type { PersonaId } from "../../domain/persona/types";
import type { Persona } from "../../domain/persona/types";
import {
  getPersonaStateSeed,
  getPersonaStaticPrompt,
} from "../../domain/persona/cards";
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
  const personaStatic = getPersonaStaticPrompt(context.persona);
  const personaState = getPersonaStateSeed(context.persona);

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
      personaStatic,
      personaState,
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
