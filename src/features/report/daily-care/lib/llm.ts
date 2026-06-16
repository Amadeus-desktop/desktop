import type { Persona } from "../../../../domain/persona/types";
import type { SafeCurrentContext } from "../../../../domain/prompt/assembly";
import type { AppLocale } from "../../../../i18n";
import { generateChatReply } from "../../../llm";
import { generateEdgeChatReply } from "../../../llm/adapters/edgeLlmRepository";
import { toLlmChatRequest } from "../../../llm/types";
import type { CompanionMessage } from "../../../companion/types";
import type { GeneralSettings } from "../../../settings/types";
import type { DailyCareInsight, ReportMetric } from "../../types";
import type { DailyCarePhase } from "./phases";
import {
  splitCompanionBubbles,
  type DailyCareReply,
  type DailyCareThreadMessage,
} from "./messageScript";

export type DailyCareBeat = {
  messages: DailyCareThreadMessage[];
  replies: DailyCareReply[];
};

type GenerateDailyCareBeatInput = {
  phase: DailyCarePhase;
  phaseIndex: number;
  totalPhases: number;
  insight: DailyCareInsight;
  metrics: ReportMetric[];
  labels: AppLocale["report"];
  persona: Persona;
  settings: GeneralSettings;
  history: DailyCareThreadMessage[];
  latestUserReply?: string;
};

export async function generateDailyCareBeat(
  input: GenerateDailyCareBeatInput,
): Promise<DailyCareBeat> {
  const directorPrompt = buildDirectorPrompt(input);
  const apiMessages: CompanionMessage[] = [
    ...toCompanionMessages(input.history),
    {
      id: `daily-care-director-${input.phaseIndex}`,
      sender: "user",
      text: directorPrompt,
    },
  ];

  try {
    const beat = await requestDailyCareBeat(input, apiMessages);
    return beat;
  } catch (error) {
    console.warn("daily_care_llm_failed", {
      phase: input.phase.kind,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallbackDailyCareBeat(input);
  }
}

async function requestDailyCareBeat(
  input: GenerateDailyCareBeatInput,
  apiMessages: CompanionMessage[],
): Promise<DailyCareBeat> {
  const request = toLlmChatRequest(apiMessages, {
    locale: input.settings.locale,
    personaId: input.persona.id,
    nickname: input.settings.nickname,
    persona: input.persona,
    mode: "deep",
    currentContext: buildDailyCareContext(input),
  });

  request.promptEnvelope = {
    ...request.promptEnvelope,
    outputContract: {
      ...request.promptEnvelope.outputContract,
      responseTokenCap: 400,
    },
  };

  try {
    const generation = await generateEdgeChatReply(request);
    return parseDailyCareBeat(generation.message, input);
  } catch (edgeError) {
    console.warn("daily_care_edge_unavailable", {
      phase: input.phase.kind,
      error: edgeError instanceof Error ? edgeError.message : String(edgeError),
    });
  }

  const generation = await generateChatReply(apiMessages, input.persona, input.settings, {
    mode: "deep",
    currentContext: buildDailyCareContext(input),
    responseTokenCap: 400,
  });
  return parseDailyCareBeat(generation.message, input);
}

function buildDailyCareContext(input: GenerateDailyCareBeatInput): SafeCurrentContext {
  return {
    source: "cloud_safe",
    allowed_surface: "app",
    summary: JSON.stringify({
      surface: "daily_care",
      phase: input.phase.kind,
      phaseIndex: input.phaseIndex,
      totalPhases: input.totalPhases,
      keywords: input.insight.keywords,
      metrics: input.metrics.map((metric) => ({
        label: metric.label,
        value: metric.value,
      })),
      narrative: input.insight.companionNarrative,
      activities: input.insight.activityDetails.map((activity) => ({
        label: activity.label,
        kind: activity.kind,
        summary: activity.summary,
      })),
      latestUserReply: input.latestUserReply ?? null,
    }),
  };
}

function buildDirectorPrompt(input: GenerateDailyCareBeatInput): string {
  const { labels, phase, latestUserReply, settings } = input;
  const phaseHint = describePhase(phase, labels);
  const language = localeLanguageHint(settings.locale);

  return [
    "[Daily Care director — hidden instruction, never quote this block]",
    `Write in ${language}. Stay fully in the selected persona voice and warmth.`,
    "This is a two-person chat, not a monologue. Acknowledge the user's last choice before adding anything new.",
    "Never reuse section titles like headers. Do not repeat earlier sentences verbatim.",
    "Stay beside the user. No scorecard tone. No bullet lists.",
    `Phase: ${phase.kind}`,
    `Phase goal: ${phaseHint}`,
    latestUserReply
      ? `User just chose: "${latestUserReply}". React to that mood first, then continue gently.`
      : "Opening beat: invite them in like a text thread, not a presentation slide.",
    'Return ONLY compact JSON: {"messages":["..."],"replies":["...","..."]}',
    "messages: 1-2 short bubbles, max 2 sentences each.",
    "replies: exactly 2 tap options the user might send as chat lines.",
    "Write replies as natural first-person chat in the user's language (Korean: casual 반말, complete or natural fragments).",
    "Each reply must express a clearly different mood (agree, curious, tired, playful, soft, etc.). Never paraphrase the same idea twice.",
    "Do not include a free-text or 'type your own' option — the UI adds that separately.",
    "On closing phase, one reply should gently end today.",
  ].join("\n");
}

function localeLanguageHint(locale: GeneralSettings["locale"]): string {
  switch (locale) {
    case "ko":
      return "Korean";
    case "ja":
      return "Japanese";
    default:
      return "English";
  }
}

function describePhase(phase: DailyCarePhase, _labels: AppLocale["report"]): string {
  switch (phase.kind) {
    case "welcome":
      return "Warmly invite the user to look back at today together.";
    case "summary":
      return `Reflect on today's flow: ${phase.narrative}`;
    case "activity":
      return `Mention this trace naturally: ${phase.activity.label} — ${phase.activity.summary}`;
    case "keywords":
      return `Name today's mood with these keywords: ${phase.keywords.join(", ")}`;
    case "closing":
      return `Close gently: ${phase.closingNote}`;
  }
}

function parseDailyCareBeat(raw: string, input: GenerateDailyCareBeatInput): DailyCareBeat {
  const parsed = extractJsonPayload(raw);
  if (parsed) {
    const rawMessages = Array.isArray(parsed.messages) ? parsed.messages : [];
    const rawReplies = Array.isArray(parsed.replies) ? parsed.replies : [];

    const messages = rawMessages
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .flatMap((text) => splitCompanionBubbles(text.trim()))
      .slice(0, 2)
      .map((text, index) => textMessage(`${input.phase.kind}-${index}`, text));

    const replies = rawReplies
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 2)
      .map((label, index) => ({ id: `reply-${index}`, label: label.trim() }));

    if (messages.length > 0 && replies.length >= 2) {
      return enrichBeat({ messages, replies }, input);
    }
  }

  return enrichBeat(
    {
      messages: splitCompanionBubbles(raw.trim()).map((text, index) =>
        textMessage(`${input.phase.kind}-raw-${index}`, text),
      ),
      replies: fallbackReplies(input),
    },
    input,
  );
}

function extractJsonPayload(raw: string): { messages?: unknown; replies?: unknown } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1)) as {
      messages?: unknown;
      replies?: unknown;
    };
  } catch {
    return null;
  }
}

function enrichBeat(beat: DailyCareBeat, input: GenerateDailyCareBeatInput): DailyCareBeat {
  const messages = [...beat.messages];

  if (input.phase.kind === "activity" && messages.length > 0) {
    messages.push({
      id: `${input.phase.activity.id}-card`,
      sender: "companion",
      kind: "activity",
      lead: input.phase.activity.summary,
      activity: input.phase.activity,
    });
  }

  if (input.phase.kind === "keywords" && messages.length > 0) {
    messages.push({
      id: "keywords-card",
      sender: "companion",
      kind: "keywords",
      lead: input.labels.summaryOverlay.steps.keywords.description,
      keywords: input.phase.keywords,
    });
  }

  return {
    messages,
    replies:
      beat.replies.length >= 2 ? beat.replies.slice(0, 2) : pickPresetReplies(input),
  };
}

export function fallbackDailyCareBeat(input: GenerateDailyCareBeatInput): DailyCareBeat {
  const { phase, labels } = input;

  switch (phase.kind) {
    case "welcome":
      return enrichBeat(
        {
          messages: [
            textMessage("welcome-1", labels.summaryOverlay.steps.welcome.title.replace(/\n/g, " ")),
            textMessage("welcome-2", labels.summaryOverlay.steps.welcome.description),
          ],
          replies: pickPresetReplies(input),
        },
        input,
      );
    case "summary":
      return enrichBeat(
        {
          messages: splitCompanionBubbles(phase.narrative).map((text, index) =>
            textMessage(`summary-${index}`, text),
          ),
          replies: fallbackReplies(input),
        },
        input,
      );
    case "activity":
      return enrichBeat(
        {
          messages: [textMessage(`activity-${phase.activity.id}`, phase.activity.summary)],
          replies: fallbackReplies(input),
        },
        input,
      );
    case "keywords":
      return enrichBeat(
        {
          messages: [
            textMessage("keywords-1", labels.summaryOverlay.steps.keywords.description),
          ],
          replies: fallbackReplies(input),
        },
        input,
      );
    case "closing":
      return enrichBeat(
        {
          messages: splitCompanionBubbles(phase.closingNote).map((text, index) =>
            textMessage(`closing-${index}`, text),
          ),
          replies: pickPresetReplies(input),
        },
        input,
      );
  }
}

export function pickPresetReplies(input: GenerateDailyCareBeatInput): DailyCareReply[] {
  const { labels, phase, phaseIndex, totalPhases } = input;
  const replies = labels.summaryOverlay.replies;
  const welcome = labels.summaryOverlay.steps.welcome;
  const finish = labels.summaryOverlay.navigation.finish;
  const isLast = phaseIndex >= totalPhases - 1;

  if (phase.kind === "closing" || isLast) {
    const pairs: DailyCareReply[][] = [
      [
        { id: "warm", label: replies.warmClose },
        { id: "thanks", label: replies.thanksClose },
      ],
      [
        { id: "grateful", label: replies.grateful },
        { id: "finish", label: finish },
      ],
      [
        { id: "soft", label: replies.soft },
        { id: "thanks", label: replies.thanksClose },
      ],
    ];
    return pairs[phaseIndex % pairs.length] ?? pairs[0];
  }

  switch (phase.kind) {
    case "welcome": {
      const pairs: DailyCareReply[][] = [
        [
          { id: "start", label: welcome.cta },
          { id: "tired", label: replies.tired },
        ],
        [
          { id: "agree", label: replies.agreeSoft },
          { id: "later", label: replies.later },
        ],
        [
          { id: "curious", label: replies.curious },
          { id: "playful", label: replies.playful },
        ],
      ];
      return pairs[phaseIndex % pairs.length] ?? pairs[0];
    }
    case "summary": {
      const pairs: DailyCareReply[][] = [
        [
          { id: "ack", label: replies.acknowledge },
          { id: "curious", label: replies.curious },
        ],
        [
          { id: "soft", label: replies.soft },
          { id: "surprised", label: replies.surprised },
        ],
        [
          { id: "continue", label: replies.continue },
          { id: "relate", label: replies.relate },
        ],
      ];
      return pairs[phaseIndex % pairs.length] ?? pairs[0];
    }
    case "activity": {
      const pairs: DailyCareReply[][] = [
        [
          { id: "ack", label: replies.acknowledge },
          { id: "need-more", label: replies.needMore },
        ],
        [
          { id: "surprised", label: replies.surprised },
          { id: "curious", label: replies.curious },
        ],
        [
          { id: "relate", label: replies.relate },
          { id: "soft", label: replies.soft },
        ],
      ];
      return pairs[phaseIndex % pairs.length] ?? pairs[0];
    }
    case "keywords": {
      const pairs: DailyCareReply[][] = [
        [
          { id: "ack", label: replies.acknowledge },
          { id: "unsure", label: replies.unsure },
        ],
        [
          { id: "agree", label: replies.agreeSoft },
          { id: "curious", label: replies.curious },
        ],
        [
          { id: "soft", label: replies.soft },
          { id: "grateful", label: replies.grateful },
        ],
      ];
      return pairs[phaseIndex % pairs.length] ?? pairs[0];
    }
    default:
      return [
        { id: "continue", label: replies.continue },
        { id: "curious", label: replies.curious },
      ];
  }
}

function fallbackReplies(input: GenerateDailyCareBeatInput): DailyCareReply[] {
  return pickPresetReplies(input);
}

function toCompanionMessages(history: DailyCareThreadMessage[]): CompanionMessage[] {
  return history
    .filter((message): message is Extract<DailyCareThreadMessage, { kind: "text" }> => {
      return message.kind === "text";
    })
    .map((message, index) => ({
      id: message.id || `history-${index}`,
      sender: message.sender,
      text: message.text,
    }));
}

function textMessage(id: string, text: string): DailyCareThreadMessage {
  return {
    id,
    sender: "companion",
    kind: "text",
    text,
  };
}

export function typingDelayMs(text: string, prefersReducedMotion: boolean): number {
  if (prefersReducedMotion) return 0;
  return Math.min(3800, 1500 + text.length * 42);
}

export const DAILY_CARE_PRE_LLM_PAUSE_MS = 1200;
export const DAILY_CARE_INTER_BUBBLE_MS = 560;
