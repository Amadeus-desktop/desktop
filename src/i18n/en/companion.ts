import type { CompanionMessages } from "../modules/companion";

export const companion: CompanionMessages = {
  presence: {
    open: "Open Amadeus",
    wake: "Wake Amadeus",
    newMessage: "New note",
  },
  status: {
    quiet: "Quietly nearby",
    pocket: "Picking up from your last note",
    deep: "Listening a little deeper",
    dailyCare: "Closing the day together",
    sleep: "Resting",
  },
  nudge: {
    close: "Close note",
    ignore: "I'm okay for now",
    open: "Open to hear it",
  },
  chat: {
    close: "Close chat",
    send: "Send",
    waiting: "One line is enough.",
    placeholder: "One line is enough",
    placeholderDeep: "You can keep going",
    dailyCareLink: "Fold today together?",
    you: "You",
    typing: "Typing",
  },
  dailyCare: {
    subtitle: "Today's small record",
    title: "You worked hard today.",
    close: "Close Daily Care",
    intro: "Want to look back at what you pushed through?",
    togetherTime: "Time together",
    noteCount: "Notes from Amadeus",
    keywords: "Today's mood keywords",
    closing: "A short note from Amadeus",
  },
  dev: {
    mate: "Mate",
    timeline: "Local Timeline",
    timelineEmpty: "No events yet",
  },
};
