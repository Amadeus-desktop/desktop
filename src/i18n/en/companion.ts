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
    togetherTimeValue: "2h 40m",
    noteCount: "Notes from Amadeus",
    noteCountValue: "3",
    keywords: "Today's mood keywords",
    keywordValue: "Endurance · Stuck · Restart",
    closing: "A short note from Amadeus",
    closingMessage: "It doesn't have to be smooth. Starting again today is already enough.",
  },
  dev: {
    mate: "Mate",
    timeline: "Local Timeline",
    timelineEmpty: "No events yet",
  },
};
