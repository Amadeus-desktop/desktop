import type { CompanionMessage } from "./types";

export const initialCompanionMessage =
  "잠깐 멈춘 것 같아서. 말 안 해도 괜찮아.";

export const initialChatMessages: CompanionMessage[] = [
  {
    id: "hello",
    sender: "companion",
    text: "오늘은 조용히 옆에 있을게.",
  },
];
