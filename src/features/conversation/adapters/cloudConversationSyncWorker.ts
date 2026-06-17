import {
  getConversationSessionForMessage as defaultGetConversationSessionForMessage,
  listPendingConversationMessages as defaultListPendingConversationMessages,
  markConversationMessageSyncFailed as defaultMarkConversationMessageSyncFailed,
  markConversationMessageSynced as defaultMarkConversationMessageSynced,
  markConversationSessionSynced as defaultMarkConversationSessionSynced,
} from "../../timeline/adapters/timelineRepository";
import type {
  ConversationMessage,
  ConversationSession,
} from "../../timeline/types";
import {
  cloudMessageUpsertInputFromLocal,
  ensureCloudConversationForSession as defaultEnsureCloudConversationForSession,
  getOrCreateCloudDevice as defaultGetOrCreateCloudDevice,
  isCloudUuid,
  upsertCloudConversationMessage as defaultUpsertCloudConversationMessage,
  type CloudConversationMessageRow,
  type CloudConversationMessageUpsertInput,
  type CloudDeviceRow,
  type EnsureCloudConversationResult,
} from "./supabaseCloudConversationRepository";

type CloudConversationSyncDependencies = {
  listPendingConversationMessages: (input?: {
    limit?: number;
  }) => Promise<ConversationMessage[]>;
  getConversationSessionForMessage: (input: {
    localMessageId: string;
  }) => Promise<ConversationSession | null>;
  ensureCloudConversationForSession: (
    session: ConversationSession,
  ) => Promise<EnsureCloudConversationResult>;
  getOrCreateCloudDevice: () => Promise<CloudDeviceRow>;
  uploadCloudConversationMessage: (
    input: CloudConversationMessageUpsertInput,
  ) => Promise<CloudConversationMessageRow>;
  markConversationSessionSynced: (input: {
    localSessionId: string;
    cloudConversationId: string;
  }) => Promise<ConversationSession>;
  markConversationMessageSynced: (input: {
    localMessageId: string;
    cloudMessageId: string;
    serverReceivedAtMs: number;
  }) => Promise<ConversationMessage>;
  markConversationMessageSyncFailed: (input: {
    localMessageId: string;
    lastError: string;
    retryable: boolean;
  }) => Promise<ConversationMessage>;
};

export type CloudConversationSyncResult = {
  processed: number;
  synced: number;
  failed: number;
  retryable: number;
};

const defaultDependencies: CloudConversationSyncDependencies = {
  listPendingConversationMessages: defaultListPendingConversationMessages,
  getConversationSessionForMessage: defaultGetConversationSessionForMessage,
  ensureCloudConversationForSession: defaultEnsureCloudConversationForSession,
  getOrCreateCloudDevice: defaultGetOrCreateCloudDevice,
  uploadCloudConversationMessage: defaultUpsertCloudConversationMessage,
  markConversationSessionSynced: defaultMarkConversationSessionSynced,
  markConversationMessageSynced: defaultMarkConversationMessageSynced,
  markConversationMessageSyncFailed: defaultMarkConversationMessageSyncFailed,
};

export async function syncPendingConversationMessages(
  dependencies: CloudConversationSyncDependencies = defaultDependencies,
  options: { limit?: number } = {},
): Promise<CloudConversationSyncResult> {
  const messages = await dependencies.listPendingConversationMessages({
    limit: options.limit ?? 20,
  });
  const result: CloudConversationSyncResult = {
    processed: 0,
    synced: 0,
    failed: 0,
    retryable: 0,
  };

  for (const message of messages) {
    result.processed += 1;
    try {
      const session = await dependencies.getConversationSessionForMessage({
        localMessageId: message.id,
      });
      if (!session) {
        throw new Error("conversation_session_missing");
      }

      const cloud = await dependencies.ensureCloudConversationForSession(session);
      if (shouldMarkConversationSessionSynced(session, cloud)) {
        await dependencies.markConversationSessionSynced({
          localSessionId: session.id,
          cloudConversationId: cloud.conversationId,
        });
      }

      const device = await dependencies.getOrCreateCloudDevice();
      const uploadInput = cloudMessageUpsertInputFromLocal(
        message,
        cloud,
        device.id,
      );
      const uploaded = await dependencies.uploadCloudConversationMessage(uploadInput);
      await dependencies.markConversationMessageSynced({
        localMessageId: message.id,
        cloudMessageId: uploaded.id,
        serverReceivedAtMs: Date.parse(uploaded.server_received_at),
      });
      result.synced += 1;
    } catch (error) {
      const retryable = isRetryableConversationSyncError(error);
      await dependencies.markConversationMessageSyncFailed({
        localMessageId: message.id,
        lastError: syncErrorMessage(error),
        retryable,
      });
      if (retryable) {
        result.retryable += 1;
      } else {
        result.failed += 1;
      }
    }
  }

  return result;
}

export function shouldMarkConversationSessionSynced(
  session: ConversationSession,
  cloud: EnsureCloudConversationResult,
): boolean {
  return !isCloudUuid(session.cloudConversationId) ||
    session.cloudConversationId !== cloud.conversationId;
}

function isRetryableConversationSyncError(error: unknown): boolean {
  if (!(error instanceof Error)) return true;
  return !error.message.startsWith("conversation_") &&
    !error.message.startsWith("cloud_persona_not_found");
}

function syncErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "conversation_sync_failed";
}
