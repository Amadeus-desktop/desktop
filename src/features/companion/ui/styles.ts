export const companionStyles = {
  stack: "inline-flex flex-col items-end gap-2 overflow-visible",

  panel:
    "flex flex-col overflow-hidden rounded-chat-panel border border-chat-border bg-chat-surface text-chat-ink shadow-chat-panel animate-chat-in dark:border-chat-border-dark dark:bg-chat-surface-dark dark:text-chat-ink-dark dark:shadow-chat-panel-dark",
  panelSize:
    "h-chat-panel max-h-[calc(100vh-1rem)] w-chat-panel max-w-[calc(100vw-1rem)]",

  header:
    "flex h-chat-header shrink-0 items-center gap-2.5 border-b border-chat-border bg-chat-header px-3 dark:border-chat-border-dark dark:bg-chat-header-dark",
  headerTitle: "text-chat-title text-chat-ink dark:text-chat-ink-dark",
  headerSubtitle: "text-chat-xs text-chat-muted dark:text-chat-muted-dark",

  iconButton:
    "ml-auto rounded-full p-1.5 text-chat-faint transition hover:bg-black/5 hover:text-chat-ink dark:hover:bg-white/10 dark:hover:text-chat-ink-dark",

  avatar:
    "size-chat-avatar shrink-0 rounded-full bg-gradient-to-br from-chat-fab-from to-chat-fab-to shadow-sm dark:from-chat-fab-from-dark dark:to-chat-fab-to-dark",
  avatarDot: "size-1.5 rounded-full bg-white/80 dark:bg-white/70",

  bubbleRow: "flex items-end gap-2",
  bubbleRowUser: "flex justify-end",
  bubbleCompanion:
    "max-w-[82%] rounded-chat-bubble rounded-bl-md border border-chat-border bg-chat-bubble-companion px-3 py-2 text-chat-sm leading-relaxed text-chat-ink dark:border-chat-border-dark dark:bg-chat-bubble-companion-dark dark:text-chat-ink-dark",
  bubbleUser:
    "max-w-[82%] rounded-chat-bubble rounded-br-md bg-chat-bubble-user px-3 py-2 text-chat-sm leading-relaxed text-chat-bubble-user-ink dark:bg-chat-bubble-user-dark dark:text-chat-bubble-user-ink-dark",
  sender: "mb-0.5 text-chat-xs font-medium text-chat-muted dark:text-chat-muted-dark",

  inputBar:
    "flex shrink-0 items-center gap-2 border-t border-chat-border bg-chat-surface px-3 py-2 dark:border-chat-border-dark dark:bg-chat-surface-dark",
  input:
    "min-w-0 flex-1 rounded-chat-input border-0 bg-chat-input px-3.5 py-2 text-chat-sm text-chat-ink outline-none placeholder:text-chat-faint focus:ring-2 focus:ring-chat-accent/25 dark:bg-chat-input-dark dark:text-chat-ink-dark dark:placeholder:text-chat-faint-dark dark:focus:ring-chat-accent-dark/30",
  sendButton:
    "flex size-8 shrink-0 items-center justify-center rounded-full bg-chat-accent text-white transition hover:opacity-90 dark:bg-chat-accent-dark",
  textLink:
    "text-chat-xs text-chat-muted transition hover:text-chat-accent dark:text-chat-muted-dark dark:hover:text-chat-accent-dark",

  fab: "relative size-chat-fab shrink-0 rounded-chat-fab bg-gradient-to-br from-chat-fab-from to-chat-fab-to shadow-chat-fab transition hover:scale-105 dark:from-chat-fab-from-dark dark:to-chat-fab-to-dark dark:shadow-chat-fab-dark",
  fabMuted: "opacity-60",
  fabRing:
    "pointer-events-none absolute inset-0 rounded-chat-fab ring-2 ring-chat-accent/25 dark:ring-chat-accent-dark/30",
  fabPulse:
    "pointer-events-none absolute -inset-1 rounded-chat-fab bg-chat-accent/15 animate-chat-pulse dark:bg-chat-accent-dark/20",
  presenceChip:
    "relative flex size-chat-fab shrink-0 items-center justify-center rounded-chat-fab border border-chat-border/80 bg-chat-surface/95 shadow-sm backdrop-blur-sm transition hover:scale-105 dark:border-chat-border-dark dark:bg-chat-surface-dark/95",
  presenceChipMuted: "opacity-55 hover:scale-100",
  badgeDot:
    "absolute -right-0.5 -top-0.5 size-1.5 rounded-full border border-chat-surface bg-chat-accent dark:border-chat-surface-dark dark:bg-chat-accent-dark",

  devPanel:
    "border-t border-chat-border bg-black/[0.02] px-3 py-3 dark:border-chat-border-dark dark:bg-white/[0.03]",
  devBox:
    "rounded-chat-bubble border border-chat-border bg-chat-input px-2 py-2 dark:border-chat-border-dark dark:bg-chat-input-dark",
  devLabel:
    "text-[10px] uppercase tracking-widest text-chat-faint dark:text-chat-faint-dark",

  statCard:
    "rounded-chat-bubble border border-chat-border bg-chat-bubble-companion px-3 py-2 dark:border-chat-border-dark dark:bg-chat-bubble-companion-dark",
} as const;
