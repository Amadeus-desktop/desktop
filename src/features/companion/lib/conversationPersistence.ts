import type { PersonaId } from "../../../domain/persona";
import {
  appendConversationMessage,
  getOrCreateConversationSession,
} from "../../timeline";
import type {
  AppendConversationMessageInput,
  ConversationMessage,
  ConversationSession,
  GetOrCreateConversationSessionInput,
} from "../../timeline/types";
import type { CompanionMessage } from "../types";

type ConversationPersistenceDependencies = {
  getOrCreateConversationSession: (
    input: GetOrCreateConversationSessionInput,
  ) => Promise<Pick<ConversationSession, "id">>;
  appendConversationMessage: (
    input: AppendConversationMessageInput,
  ) => Promise<Partial<ConversationMessage>>;
};

type PersistCompanionExchangeInput = {
  personaId: PersonaId;
  userMessage: CompanionMessage;
  replyMessage: CompanionMessage;
  provider: string;
};

const defaultDependencies: ConversationPersistenceDependencies = {
  getOrCreateConversationSession,
  appendConversationMessage,
};

export async function persistCompanionExchange(
  input: PersistCompanionExchangeInput,
  dependencies: ConversationPersistenceDependencies = defaultDependencies,
): Promise<void> {
  const session = await dependencies.getOrCreateConversationSession({
    personaId: input.personaId,
  });

  await dependencies.appendConversationMessage({
    sessionId: session.id,
    role: "user",
    content: input.userMessage.text,
    provider: null,
    idempotencyKey: input.userMessage.id,
  });
  await dependencies.appendConversationMessage({
    sessionId: session.id,
    role: "assistant",
    content: input.replyMessage.text,
    provider: input.provider,
    idempotencyKey: input.replyMessage.id,
  });
}
