export const companionStyles = {
  stack: "inline-flex flex-col items-end gap-2.5 overflow-visible p-2.5",

  panel:
    "flex flex-col overflow-hidden rounded-chat-panel border border-chat-border bg-chat-surface text-chat-ink shadow-chat-panel animate-chat-in dark:border-chat-border-dark dark:bg-chat-surface-dark dark:text-chat-ink-dark",
  panelSize:
    "h-chat-panel max-h-[calc(100vh-1.25rem)] w-chat-panel max-w-[calc(100vw-1.25rem)]",

  header:
    "flex h-chat-header shrink-0 items-center gap-3 border-b border-chat-border bg-chat-header px-3.5 dark:border-chat-border-dark dark:bg-chat-header-dark",
  headerTitle: "text-chat-title text-chat-ink dark:text-chat-ink-dark",
  headerSubtitle: "text-chat-xs text-chat-muted dark:text-chat-muted-dark",

  iconButton:
    "ml-auto rounded-full p-1.5 text-chat-faint transition hover:bg-[#3a3a40] hover:text-chat-ink dark:hover:text-chat-ink-dark",

  bubbleRow: "flex items-end gap-2.5",
  bubbleRowUser: "flex justify-end",
  bubbleCompanion:
    "max-w-[88%] rounded-chat-bubble rounded-bl-md border border-chat-border bg-chat-bubble-companion px-3.5 py-2.5 text-chat-sm leading-relaxed text-chat-ink dark:border-chat-border-dark dark:bg-chat-bubble-companion-dark dark:text-chat-ink-dark",
  bubbleUser:
    "max-w-[88%] rounded-chat-bubble rounded-br-md border border-[#0a84ff]/40 bg-chat-bubble-user px-3.5 py-2.5 text-chat-sm leading-relaxed text-chat-bubble-user-ink dark:bg-chat-bubble-user-dark dark:text-chat-bubble-user-ink-dark",
  sender:
    "mb-1 text-chat-xs font-medium text-chat-muted dark:text-chat-muted-dark",

  inputBar:
    "flex shrink-0 items-center gap-2 border-t border-chat-border bg-chat-surface px-3.5 py-2.5 dark:border-chat-border-dark dark:bg-chat-surface-dark",
  input:
    "min-w-0 flex-1 rounded-chat-input border border-[#3a3a40] bg-chat-input px-3.5 py-2 text-chat-sm text-chat-ink outline-none placeholder:text-chat-faint focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/20 dark:text-chat-ink-dark dark:placeholder:text-chat-faint-dark dark:bg-chat-input-dark",
  sendButton:
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-[#0a84ff] text-white transition hover:bg-[#0077ed]",
  textLink:
    "text-chat-xs text-chat-muted transition hover:text-[#0a84ff] dark:text-chat-muted-dark",

  nudgeCard:
    "w-chat-nudge max-w-[calc(100vw-1.25rem)] overflow-hidden rounded-chat-nudge border-2 border-[#505058] bg-[#28282d] text-[#f5f5f7] shadow-[0_12px_40px_rgb(0_0_0_/_0.45)] animate-chat-in",
  nudgeBody: "flex gap-3 p-3.5",
  nudgeHeader: "mb-2 flex items-start justify-between gap-2",
  nudgeMessage:
    "block w-full rounded-[14px] border border-[#42424a] bg-[#323238] px-3.5 py-2.5 text-left text-chat-sm leading-relaxed text-[#f5f5f7] transition active:scale-[0.995]",
  nudgeClose:
    "flex size-7 shrink-0 items-center justify-center rounded-full border border-[#585860] bg-[#3a3a40] text-[#a1a1a6] transition hover:bg-[#48484f] hover:text-[#f5f5f7]",

  devPanel:
    "border-t border-chat-border bg-[#1a1a1e] px-3.5 py-3 dark:border-chat-border-dark",
  devBox:
    "rounded-chat-bubble border border-chat-border bg-chat-input px-2.5 py-2 dark:border-chat-border-dark dark:bg-chat-input-dark",
  devLabel:
    "text-[10px] uppercase tracking-widest text-chat-faint dark:text-chat-faint-dark",

  statCard:
    "rounded-chat-bubble border border-chat-border bg-chat-bubble-companion px-3.5 py-2.5 dark:border-chat-border-dark dark:bg-chat-bubble-companion-dark",
} as const;
