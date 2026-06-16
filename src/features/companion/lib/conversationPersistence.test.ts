import { describe, expect, it, vi } from "vitest";
import {
  persistCompanionExchange,
  persistCompanionMessage,
  restoreCompanionMessagesForPersona,
} from "./conversationPersistence";

describe("persistCompanionExchange", () => {
  it("stores user and assistant messages in a persona-scoped session", async () => {
    const getOrCreateConversationSession = vi.fn().mockResolvedValue({
      id: "session-seoyeon",
      personaId: "seoyeon-modern-senior",
    });
    const appendConversationMessage = vi.fn().mockResolvedValue({});
    const listConversationMessagesForPersona = vi.fn().mockResolvedValue([]);

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
        listConversationMessagesForPersona,
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

  it("stores a single user message before reply generation completes", async () => {
    const getOrCreateConversationSession = vi.fn().mockResolvedValue({
      id: "session-makise",
    });
    const appendConversationMessage = vi.fn().mockResolvedValue({});
    const listConversationMessagesForPersona = vi.fn().mockResolvedValue([]);

    await persistCompanionMessage(
      {
        personaId: "makise-kurisu",
        message: {
          id: "user-early",
          sender: "user",
          text: "지금 막혔어.",
        },
        role: "user",
      },
      {
        getOrCreateConversationSession,
        appendConversationMessage,
        listConversationMessagesForPersona,
      },
    );

    expect(appendConversationMessage).toHaveBeenCalledWith({
      sessionId: "session-makise",
      role: "user",
      content: "지금 막혔어.",
      provider: null,
      idempotencyKey: "user-early",
    });
  });

  it("restores persona-scoped conversation messages for the companion UI", async () => {
    const getOrCreateConversationSession = vi.fn();
    const appendConversationMessage = vi.fn();
    const listConversationMessagesForPersona = vi.fn().mockResolvedValue([
      {
        id: "msg-1",
        role: "user",
        content: "오늘 한글 작업했어.",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "응, 한글을 오래 붙잡고 있었지.",
      },
      {
        id: "msg-3",
        role: "system_summary",
        content: "hidden",
      },
    ]);

    const restored = await restoreCompanionMessagesForPersona("makise-kurisu", {
      getOrCreateConversationSession,
      appendConversationMessage,
      listConversationMessagesForPersona,
    });

    expect(listConversationMessagesForPersona).toHaveBeenCalledWith({
      personaId: "makise-kurisu",
      limit: 40,
    });
    expect(restored).toEqual([
      {
        id: "msg-1",
        sender: "user",
        text: "오늘 한글 작업했어.",
      },
      {
        id: "msg-2",
        sender: "companion",
        text: "응, 한글을 오래 붙잡고 있었지.",
      },
    ]);
  });
});
