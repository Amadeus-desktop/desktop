export type ConversationMessageRole = "user" | "assistant" | "system_summary";

export type ConversationSyncStatus =
  | "pending"
  | "retrying"
  | "synced"
  | "error"
  | "conflicted"
  | "deleted";

export type ConversationMessageMirror = {
  id: string;
  cloudMessageId: string | null;
  sessionId: string;
  role: ConversationMessageRole;
  content: string;
  provider: string | null;
  syncStatus: ConversationSyncStatus;
  idempotencyKey: string;
  clientSequence: number;
  createdAtMs: number;
  serverReceivedAtMs: number | null;
  sourceDeviceId: string | null;
};

export type CloudMessageAck = {
  cloudMessageId: string;
  idempotencyKey: string;
  serverReceivedAtMs: number;
};

export function applyCloudMessageAck(
  messages: ConversationMessageMirror[],
  ack: CloudMessageAck,
): ConversationMessageMirror[] {
  return messages.map((message) => {
    if (message.idempotencyKey !== ack.idempotencyKey) {
      return message;
    }

    return {
      ...message,
      cloudMessageId: ack.cloudMessageId,
      syncStatus: "synced",
      serverReceivedAtMs: ack.serverReceivedAtMs,
    };
  });
}

export function orderConversationMessages(
  messages: ConversationMessageMirror[],
): ConversationMessageMirror[] {
  return [...messages].sort((left, right) => {
    return (
      left.createdAtMs - right.createdAtMs ||
      stableString(left.sourceDeviceId).localeCompare(stableString(right.sourceDeviceId)) ||
      left.clientSequence - right.clientSequence ||
      nullableNumber(left.serverReceivedAtMs) - nullableNumber(right.serverReceivedAtMs) ||
      stableString(left.cloudMessageId ?? left.id).localeCompare(
        stableString(right.cloudMessageId ?? right.id),
      )
    );
  });
}

export function pausePendingMessagesForAuthExpiry(
  messages: ConversationMessageMirror[],
): ConversationMessageMirror[] {
  return messages.map((message) => {
    if (message.syncStatus !== "pending" && message.syncStatus !== "retrying") {
      return message;
    }

    return {
      ...message,
      syncStatus: "pending",
    };
  });
}

function stableString(value: string | null): string {
  return value ?? "";
}

function nullableNumber(value: number | null): number {
  return value ?? Number.MAX_SAFE_INTEGER;
}
