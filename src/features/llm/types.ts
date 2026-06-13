import type { CompanionMessage } from "../companion/types";

export type LlmChatRole = "companion" | "user";

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export type LlmChatRequest = {
  messages: LlmChatMessage[];
};

export type LlmGeneration = {
  message: string;
  provider: string;
};

export function toLlmChatRequest(
  messages: CompanionMessage[],
): LlmChatRequest {
  return {
    messages: messages.map((message) => ({
      role: message.sender,
      content: message.text,
    })),
  };
}
