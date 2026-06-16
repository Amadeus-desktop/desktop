import { describe, expect, it, vi } from "vitest";
import { persistCompanionExchange } from "./conversationPersistence";

describe("persistCompanionExchange", () => {
  it("stores user and assistant messages in a persona-scoped session", async () => {
    const getOrCreateConversationSession = vi.fn().mockResolvedValue({
      id: "session-seoyeon",
      personaId: "seoyeon-modern-senior",
    });
    const appendConversationMessage = vi.fn().mockResolvedValue({});

    await persistCompanionExchange(
      {
        personaId: "seoyeon-modern-senior",
        userMessage: {
          id: "user-1",
          sender: "user",
          text: "오늘 힘들어.",
        },
        replyMessage: {
          id: "assistant-1",
          sender: "companion",
          text: "여기 있어.",
        },
        provider: "edge:openai",
      },
      {
        getOrCreateConversationSession,
        appendConversationMessage,
      },
    );

    expect(getOrCreateConversationSession).toHaveBeenCalledWith({
      personaId: "seoyeon-modern-senior",
    });
    expect(appendConversationMessage).toHaveBeenNthCalledWith(1, {
      sessionId: "session-seoyeon",
      role: "user",
      content: "오늘 힘들어.",
      provider: null,
      idempotencyKey: "user-1",
    });
    expect(appendConversationMessage).toHaveBeenNthCalledWith(2, {
      sessionId: "session-seoyeon",
      role: "assistant",
      content: "여기 있어.",
      provider: "edge:openai",
      idempotencyKey: "assistant-1",
    });
  });
});
