import type { LocaleCode } from "../../i18n/types";
import type { PersonaId } from "../persona/types";
import type { CompanionMessage } from "../../features/companion/types";
import type { LlmGeneration } from "../../features/llm/types";

type TemplateChatLabels = {
  chatEmpty: string;
  chatReply: string;
};

export function buildBrowserTemplateChatReply(
  messages: CompanionMessage[],
  labels: TemplateChatLabels,
): LlmGeneration {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.sender === "user")
    ?.text.trim();

  return {
    message: lastUserMessage ? labels.chatReply : labels.chatEmpty,
    provider: "template",
  };
}

export type LlmChatContext = {
  locale: LocaleCode;
  personaId: PersonaId;
  nickname: string;
};
