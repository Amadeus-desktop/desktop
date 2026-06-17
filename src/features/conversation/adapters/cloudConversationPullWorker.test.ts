import { describe, expect, it, vi } from "vitest";
import { pullCloudConversationMessages } from "./cloudConversationPullWorker";
import type { CloudConversationMessageRow } from "./supabaseCloudConversationRepository";

const cloudRow: CloudConversationMessageRow = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "user-1",
  conversation_id: "11111111-1111-4111-8111-111111111111",
  persona_id: "33333333-3333-4333-8333-333333333333",
  role: "assistant",
  content: "웹에서 온 답장이야.",
  provider: "edge",
  surface: "web",
  source_device_id: null,
  local_message_id: null,
  idempotency_key: "web-msg-1",
  safety_grade: "Account",
  client_created_at: "2026-06-17T00:00:00.000Z",
  client_sequence: 1,
  server_received_at: "2026-06-17T00:00:01.000Z",
  created_at: "2026-06-17T00:00:01.000Z",
};

describe("pullCloudConversationMessages", () => {
  it("maps cloud messages into local upserts", async () => {
    const upsertCloudConversationMessage = vi.fn().mockResolvedValue({
      id: "cloud-22222222-2222-4222-8222-222222222222",
    });

    const result = await pullCloudConversationMessages(
      { personaId: "makise-kurisu", limit: 10 },
      {
        listCloudConversationMessages: vi.fn().mockResolvedValue([cloudRow]),
        upsertCloudConversationMessage,
      },
    );

    expect(upsertCloudConversationMessage).toHaveBeenCalledWith({
      cloudConversationId: "11111111-1111-4111-8111-111111111111",
      cloudMessageId: "22222222-2222-4222-8222-222222222222",
      personaId: "33333333-3333-4333-8333-333333333333",
      role: "assistant",
      content: "웹에서 온 답장이야.",
      provider: "edge",
      idempotencyKey: "web-msg-1",
      clientCreatedAtMs: Date.parse("2026-06-17T00:00:00.000Z"),
      clientSequence: 1,
      serverReceivedAtMs: Date.parse("2026-06-17T00:00:01.000Z"),
    });
    expect(result).toEqual({ pulled: 1, upserted: 1, failed: 0 });
  });
});
