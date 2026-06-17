import {
  validateMemoryCandidate,
  type MemoryCandidate,
} from "./cards";
import type { SyncPayloadEnvelope } from "../../features/timeline/types";

export type ConversationMemorySourceMessage = {
  id: string;
  role: "user" | "assistant" | "system_summary";
  content: string;
  createdAtMs: number;
};

export type ConversationMemoryExtractionInput = {
  personaId: string;
  messages: ConversationMemorySourceMessage[];
  nowMs: number;
};

const FORBIDDEN_MEMORY_SYNC_PATTERN =
  /(?:raw_ocr_text|screenshot|file_path|full_url|token=|password=|api_key=|secret=|\/Users\/|[A-Z]:\\|https?:\/\/|\?.*=)/i;

export function extractConversationMemoryCandidates(
  input: ConversationMemoryExtractionInput,
): MemoryCandidate[] {
  const messages = input.messages.filter((message) => message.content.trim());
  if (!input.personaId.trim() || messages.length === 0) return [];

  const joinedContent = messages.map((message) => message.content).join(" ");
  if (containsForbiddenMemorySyncContent(joinedContent)) return [];

  const userPreference = firstUserPreference(messages);
  const candidate: MemoryCandidate = userPreference
    ? {
        userId: "",
        personaId: input.personaId,
        memoryCategory: "semantic",
        memoryType: "user_preference",
        content: userPreference.content,
        confidence: 82,
        source: "conversation",
        visibility: "cloud_safe",
        normalizedKey: normalizedPreferenceKey(userPreference.content),
        sourceMessageIds: messages.map((message) => message.id),
        evidenceExcerptRedacted: redactedEvidenceExcerpt(userPreference.evidence),
        observedAtMs: input.nowMs,
        userConfirmed: false,
        writeReason: "conversation_safe_summary",
      }
    : {
        userId: "",
        personaId: input.personaId,
        memoryCategory: "episodic",
        memoryType: "episodic_summary",
        content: conversationSummary(messages),
        confidence: 72,
        source: "conversation",
        visibility: "cloud_safe",
        normalizedKey: `conversation:${messages.map((message) => message.id).join(":")}`,
        sourceMessageIds: messages.map((message) => message.id),
        evidenceExcerptRedacted: redactedEvidenceExcerpt(joinedContent),
        observedAtMs: input.nowMs,
        userConfirmed: false,
        writeReason: "conversation_safe_summary",
      };

  const validation = validateMemoryCandidate(candidate);
  return validation.accepted ? [candidate] : [];
}

export function memorySummaryEnvelopeFromCandidate(
  candidate: MemoryCandidate,
): SyncPayloadEnvelope {
  return {
    schemaVersion: 1,
    eventType: "memory.summary",
    payloadClass: "SafeSummary",
    safetyGrade: "SafeWorkSummary",
    redactionLevel: "SummaryRedacted",
    retentionPolicy: "Session",
    validatorVersion: "memory-summary.v1",
    payload: {
      personaId: candidate.personaId,
      memoryCategory: candidate.memoryCategory,
      memoryType: candidate.memoryType,
      content: candidate.content,
      confidence: candidate.confidence,
      source: candidate.source,
      normalizedKey: candidate.normalizedKey,
      sourceMessageIds: candidate.sourceMessageIds,
      evidenceExcerptRedacted: candidate.evidenceExcerptRedacted,
      observedAt: new Date(candidate.observedAtMs ?? Date.now()).toISOString(),
      validFrom: candidate.validFromMs
        ? new Date(candidate.validFromMs).toISOString()
        : null,
      expiresAt: candidate.expiresAtMs
        ? new Date(candidate.expiresAtMs).toISOString()
        : null,
      userConfirmed: candidate.userConfirmed,
      writeReason: candidate.writeReason,
    },
  };
}

export function containsForbiddenMemorySyncContent(value: string): boolean {
  return FORBIDDEN_MEMORY_SYNC_PATTERN.test(value);
}

function firstUserPreference(messages: ConversationMemorySourceMessage[]): {
  content: string;
  evidence: string;
} | null {
  const message = messages.find(
    (item) =>
      item.role === "user" &&
      /(?:좋아|선호|앞으로|기억|짧게|길게|반말|존댓말|답변)/.test(item.content),
  );
  if (!message) return null;

  return {
    content: `사용자는 대화에서 다음 선호를 밝혔다: ${compactText(message.content)}`,
    evidence: message.content,
  };
}

function conversationSummary(messages: ConversationMemorySourceMessage[]): string {
  const visible = messages
    .filter((message) => message.role !== "system_summary")
    .map((message) => compactText(message.content))
    .join(" / ");
  return `최근 대화 요약: ${visible.slice(0, 220)}`;
}

function normalizedPreferenceKey(content: string): string {
  if (/짧게/.test(content)) return "preference:reply_length:short";
  if (/길게/.test(content)) return "preference:reply_length:long";
  if (/반말/.test(content)) return "preference:tone:casual";
  if (/존댓말/.test(content)) return "preference:tone:polite";
  return `preference:${compactText(content).slice(0, 48)}`;
}

function redactedEvidenceExcerpt(value: string): string {
  return compactText(value)
    .replace(FORBIDDEN_MEMORY_SYNC_PATTERN, "[redacted]")
    .slice(0, 160);
}

function compactText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}
