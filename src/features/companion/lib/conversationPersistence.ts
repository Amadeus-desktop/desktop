import type { PersonaId } from "../../../domain/persona";
import {
  appendConversationMessage,
  getOrCreateConversationSession,
  listConversationMessagesForPersona,
} from "../../timeline";
import type {
  AppendConversationMessageInput,
  ConversationMessage,
  ConversationSession,
  GetOrCreateConversationSessionInput,
  ListConversationMessagesInput,
} from "../../timeline/types";
import type { CompanionMessage } from "../types";

type ConversationPersistenceDependencies = {
  getOrCreateConversationSession: (
    input: GetOrCreateConversationSessionInput,
  ) => Promise<Pick<ConversationSession, "id">>;
  appendConversationMessage: (
    input: AppendConversationMessageInput,
  ) => Promise<Partial<ConversationMessage>>;
  listConversationMessagesForPersona: (
    input: ListConversationMessagesInput,
  ) => Promise<ConversationMessage[]>;
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
  listConversationMessagesForPersona,
};

export async function persistCompanionMessage(
  input: {
    personaId: PersonaId;
    message: CompanionMessage;
    role: AppendConversationMessageInput["role"];
    provider?: string | null;
  },
  dependencies: ConversationPersistenceDependencies = defaultDependencies,
): Promise<void> {
  const session = await dependencies.getOrCreateConversationSession({
    personaId: input.personaId,
  });

  await dependencies.appendConversationMessage({
    sessionId: session.id,
    role: input.role,
    content: input.message.text,
    provider: input.provider ?? null,
    idempotencyKey: input.message.id,
  });
}

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

export async function restoreCompanionMessagesForPersona(
  personaId: PersonaId,
  dependencies: ConversationPersistenceDependencies = defaultDependencies,
): Promise<CompanionMessage[]> {
  const messages = await dependencies.listConversationMessagesForPersona({
    personaId,
    limit: 40,
  });

  return messages.flatMap((message) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    return [
      {
        id: message.id,
        sender: message.role === "assistant" ? "companion" : "user",
        text: message.content,
      } satisfies CompanionMessage,
    ];
  });
}
