import type { PersonaId } from "../../domain/persona/types";
import type { LocaleCode } from "../../i18n/types";
import type { CompanionMessage } from "../companion/types";

export type LlmChatRole = "companion" | "user";

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmChatRequest = {
  messages: LlmChatMessage[];
  locale: LocaleCode;
  personaId: PersonaId;
  nickname: string;
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
  },
): LlmChatRequest {
  return {
    messages: messages.map((message) => ({
      role: message.sender,
      content: message.text,
    })),
    locale: context.locale,
    personaId: context.personaId,
    nickname: context.nickname,
  };
}
