import { describe, expect, it } from "vitest";
import {
  applyCloudMessageAck,
  orderConversationMessages,
  pausePendingMessagesForAuthExpiry,
  type ConversationMessageMirror,
} from "./syncPolicy";

const baseMessage: ConversationMessageMirror = {
  id: "local-1",
  cloudMessageId: null,
  sessionId: "session-1",
  role: "user",
  content: "hello",
  provider: null,
  syncStatus: "pending",
  idempotencyKey: "idem-1",
  clientSequence: 1,
  createdAtMs: 1_000,
  serverReceivedAtMs: null,
  sourceDeviceId: "device-1",
};

describe("conversation sync policy", () => {
  it("marks duplicate upload ack as synced without creating another local message", () => {
    const result = applyCloudMessageAck([baseMessage], {
      cloudMessageId: "cloud-1",
      idempotencyKey: "idem-1",
      serverReceivedAtMs: 2_000,
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "local-1",
      cloudMessageId: "cloud-1",
      syncStatus: "synced",
      serverReceivedAtMs: 2_000,
    });
  });

  it("keeps user-visible stable order when web and app messages interleave", () => {
    const messages: ConversationMessageMirror[] = [
      {
        ...baseMessage,
        id: "web-later",
        cloudMessageId: "cloud-3",
        idempotencyKey: "web-2",
        clientSequence: 1,
        createdAtMs: 1_500,
        serverReceivedAtMs: 1_800,
        sourceDeviceId: "web",
        syncStatus: "synced",
      },
      {
        ...baseMessage,
        id: "app-first",
        cloudMessageId: "cloud-1",
        idempotencyKey: "app-1",
        clientSequence: 1,
        createdAtMs: 1_000,
        serverReceivedAtMs: 2_000,
        sourceDeviceId: "app",
        syncStatus: "synced",
      },
      {
        ...baseMessage,
        id: "app-second",
        cloudMessageId: "cloud-2",
        idempotencyKey: "app-2",
        clientSequence: 2,
        createdAtMs: 1_000,
        serverReceivedAtMs: 2_100,
        sourceDeviceId: "app",
        syncStatus: "synced",
      },
    ];

    expect(orderConversationMessages(messages).map((message) => message.id)).toEqual([
      "app-first",
      "app-second",
      "web-later",
    ]);
  });

  it("keeps unsynced local content pending when auth expires", () => {
    const [message] = pausePendingMessagesForAuthExpiry([
      { ...baseMessage, syncStatus: "retrying" },
    ]);

    expect(message).toMatchObject({
      content: "hello",
      syncStatus: "pending",
      cloudMessageId: null,
    });
  });
});
