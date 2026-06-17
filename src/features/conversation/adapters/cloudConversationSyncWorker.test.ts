import { describe, expect, it, vi } from "vitest";
import type {
  ConversationMessage,
  ConversationSession,
} from "../../timeline/types";
import {
  shouldMarkConversationSessionSynced,
  syncPendingConversationMessages,
} from "./cloudConversationSyncWorker";

const session: ConversationSession = {
  id: "local-session-1",
  cloudConversationId: "local-local-session-1",
  personaId: "makise-kurisu",
  source: "app",
  syncStatus: "pending",
  lastSyncedMessageAtMs: null,
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
};

const message: ConversationMessage = {
  id: "local-message-1",
  sessionId: "local-session-1",
  role: "user",
  content: "웹에도 보여줘.",
  provider: null,
  idempotencyKey: "local-message-1",
  cloudMessageId: null,
  syncStatus: "pending",
  clientSequence: 1,
  createdAtMs: 1_797_398_400_000,
  serverReceivedAtMs: null,
};

describe("syncPendingConversationMessages", () => {
  it("creates a cloud conversation for local sessions and marks the message synced", async () => {
    const markConversationSessionSynced = vi.fn().mockResolvedValue({
      ...session,
      cloudConversationId: "11111111-1111-4111-8111-111111111111",
      syncStatus: "synced",
    });
    const uploadCloudConversationMessage = vi.fn().mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      server_received_at: "2026-06-17T00:00:01.000Z",
    });
    const markConversationMessageSynced = vi.fn().mockResolvedValue({
      ...message,
      cloudMessageId: "22222222-2222-4222-8222-222222222222",
      syncStatus: "synced",
    });

    const result = await syncPendingConversationMessages({
      listPendingConversationMessages: vi.fn().mockResolvedValue([message]),
      getConversationSessionForMessage: vi.fn().mockResolvedValue(session),
      ensureCloudConversationForSession: vi.fn().mockResolvedValue({
        conversationId: "11111111-1111-4111-8111-111111111111",
        personaId: "33333333-3333-4333-8333-333333333333",
      }),
      getOrCreateCloudDevice: vi.fn().mockResolvedValue({
        id: "44444444-4444-4444-8444-444444444444",
      }),
      uploadCloudConversationMessage,
      markConversationSessionSynced,
      markConversationMessageSynced,
      markConversationMessageSyncFailed: vi.fn(),
    });

    expect(markConversationSessionSynced).toHaveBeenCalledWith({
      localSessionId: "local-session-1",
      cloudConversationId: "11111111-1111-4111-8111-111111111111",
    });
    expect(uploadCloudConversationMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "11111111-1111-4111-8111-111111111111",
        personaId: "33333333-3333-4333-8333-333333333333",
        localMessageId: "local-message-1",
        sourceDeviceId: "44444444-4444-4444-8444-444444444444",
        idempotencyKey: "local-message-1",
      }),
    );
    expect(markConversationMessageSynced).toHaveBeenCalledWith({
      localMessageId: "local-message-1",
      cloudMessageId: "22222222-2222-4222-8222-222222222222",
      serverReceivedAtMs: Date.parse("2026-06-17T00:00:01.000Z"),
    });
    expect(result).toEqual({ processed: 1, synced: 1, failed: 0, retryable: 0 });
  });

  it("does not re-mark a session that already points at the cloud conversation", () => {
    expect(
      shouldMarkConversationSessionSynced(
        {
          ...session,
          cloudConversationId: "11111111-1111-4111-8111-111111111111",
        },
        {
          conversationId: "11111111-1111-4111-8111-111111111111",
          personaId: "33333333-3333-4333-8333-333333333333",
        },
      ),
    ).toBe(false);
  });
});
