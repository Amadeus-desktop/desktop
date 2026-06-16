import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
  eyebrow: "Daily Care",
  title: "Today's reflection",
  description: "Look back at the time you held on and the moments you came back.",
  intro: {
    prompt: "You worked hard today. Want to look back together?",
  },
  sections: {
    summary: "Time together today",
    moments: "Today's moments",
    closing: "A closing note",
  },
  metrics: {
    togetherTime: "Time together",
    nudges: "Today's nudges",
    chatOpens: "Times you opened chat",
    returns: "Moments you came back",
  },
  emotionalKeywords: {
    title: "Today's mood words",
    fallback: "A quiet day you held through",
    tags: {
      steady: "Steady",
      tired: "Tired",
      focused: "Focused",
      gentle: "Gentle",
      return: "Came back",
    },
  },
  closingNote: {
    title: "From your companion",
    quiet:
      "It was a quiet day — but you weren't alone. I was right here with you.",
    gentle:
      "You held on well today. Coming back each time was already enough.",
    active:
      "It was a busy day. Thanks for pausing to talk with me along the way.",
  },
  timeline: {
    loading: "Loading today's moments…",
    empty: "No shared moments yet today.",
    refresh: "Refresh",
    expand: "Show {count} more",
    collapse: "Show less",
  },
  format: {
    hoursMinutes: "{hours}h {minutes}m",
    hoursOnly: "{hours}h",
    minutesOnly: "{minutes}m",
    zeroDuration: "No record yet",
    count: "{count}",
    zeroCount: "None",
  },
};
