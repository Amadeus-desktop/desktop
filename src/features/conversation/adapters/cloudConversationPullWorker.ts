import { upsertCloudConversationMessage as defaultUpsertCloudConversationMessage } from "../../timeline/adapters/timelineRepository";
import type { ConversationMessage } from "../../timeline/types";
import {
  listCloudConversationMessages as defaultListCloudConversationMessages,
  localUpsertInputFromCloudMessage,
  type CloudConversationMessageRow,
} from "./supabaseCloudConversationRepository";

type CloudConversationPullDependencies = {
  listCloudConversationMessages: (input: {
    personaId: string;
    sinceServerReceivedAtMs?: number | null;
    limit?: number;
  }) => Promise<CloudConversationMessageRow[]>;
  upsertCloudConversationMessage: (input: {
    cloudConversationId: string;
    cloudMessageId: string;
    personaId: string;
    role: "user" | "assistant" | "system_summary";
    content: string;
    provider?: string | null;
    idempotencyKey: string;
    clientCreatedAtMs: number;
    clientSequence?: number | null;
    serverReceivedAtMs: number;
  }) => Promise<ConversationMessage>;
};

export type CloudConversationPullResult = {
  pulled: number;
  upserted: number;
  failed: number;
};

const defaultDependencies: CloudConversationPullDependencies = {
  listCloudConversationMessages: defaultListCloudConversationMessages,
  upsertCloudConversationMessage: defaultUpsertCloudConversationMessage,
};

export async function pullCloudConversationMessages(
  input: {
    personaId: string;
    sinceServerReceivedAtMs?: number | null;
    limit?: number;
  },
  dependencies: CloudConversationPullDependencies = defaultDependencies,
): Promise<CloudConversationPullResult> {
  const rows = await dependencies.listCloudConversationMessages({
    personaId: input.personaId,
    sinceServerReceivedAtMs: input.sinceServerReceivedAtMs ?? null,
    limit: input.limit ?? 50,
  });
  const result: CloudConversationPullResult = {
    pulled: rows.length,
    upserted: 0,
    failed: 0,
  };

  for (const row of rows) {
    try {
      await dependencies.upsertCloudConversationMessage(
        localUpsertInputFromCloudMessage(row),
      );
      result.upserted += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
