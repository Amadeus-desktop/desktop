export const companionStyles = {
  stack:
    "tauri-interactive-zone inline-flex flex-col items-end justify-end gap-2.5 overflow-visible p-2.5",

  /** Compact nudge bubble sitting above the mate anchor. */
  nudgeCard:
    "w-chat-nudge origin-bottom-right rounded-[20px] border border-white/10 bg-[#2b2629]/95 px-3.5 py-3 text-[color:var(--shell-ink)] shadow-[0_16px_40px_rgb(0_0_0/0.35)] backdrop-blur-md transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-safe-animate animate-tab-panel-enter",

  nudgeName:
    "mb-1.5 text-[11px] font-semibold text-[color:rgb(var(--accent-rgb)/0.9)]",
  nudgeMessage:
    "block w-full rounded-[14px] bg-white/[0.04] px-3 py-2.5 text-left text-[13px] leading-relaxed text-[color:var(--shell-ink)] transition hover:bg-white/[0.07] active:scale-[0.995]",

  /** Full chat sheet above anchor — LoveyDovey / Zeta inspired warm chat. */
  chatPanel: [
    "flex h-chat-panel w-chat-panel origin-bottom-right flex-col overflow-hidden rounded-[24px]",
    "border border-white/10 bg-[#1f1b1e] shadow-[0_20px_48px_rgb(0_0_0/0.42)]",
    "transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-safe-animate animate-tab-panel-enter",
  ].join(" "),

  chatHeader:
    "flex shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3",
  chatAvatar:
    "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.05]",
  chatTitle: "truncate text-[14px] font-semibold leading-tight text-[color:var(--shell-ink)]",
  chatStatus: "truncate text-[11px] leading-4 text-[color:var(--shell-ink-faint)]",

  chatBody:
    "min-h-0 flex-1 overflow-y-auto bg-[#181416] px-3.5 py-3.5",

  chatThread: "flex flex-col gap-3.5",
  chatEmpty: "px-1 text-center text-[12px] leading-relaxed text-[color:var(--shell-ink-faint)]",

  chatInputBar: "shrink-0 border-t border-white/[0.06] bg-[#151214] px-3.5 pb-3.5 pt-3",
  chatInputWrap:
    "flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
  chatInput:
    "min-w-0 flex-1 bg-transparent px-1 py-1.5 text-[13px] text-[color:var(--shell-ink)] outline-none placeholder:text-[color:var(--shell-ink-faint)]",

  bubbleRow: "flex items-end gap-2.5",
  bubbleRowUser: "flex justify-end",
  bubbleCompanion:
    "rounded-[20px] rounded-bl-[8px] border border-white/[0.07] bg-[#342f33] px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#f8f3f0] shadow-[0_2px_10px_rgb(0_0_0/0.18)]",
  bubbleUser:
    "rounded-[20px] rounded-br-[8px] border border-[color:rgb(var(--accent-rgb)/0.35)] bg-[color:rgb(var(--accent-rgb)/0.24)] px-3.5 py-2.5 text-[13px] leading-[1.55] text-[#fff8f4] shadow-[0_2px_10px_rgb(0_0_0/0.16)]",
  senderCompanion:
    "mb-1 px-1 text-[11px] font-semibold text-[color:rgb(var(--accent-rgb)/0.82)]",
  senderUser:
    "px-1 text-[11px] font-medium text-[color:var(--shell-ink-muted)]",
  typingBubble:
    "inline-flex min-h-[2.5rem] min-w-[3.5rem] items-center rounded-[20px] rounded-bl-[8px] border border-white/[0.07] bg-[#342f33] px-3.5 py-2.5",
  sender: "mb-1 text-[10px] font-medium text-[color:var(--shell-ink-faint)]",

  iconButton:
    "shrink-0 rounded-full p-1.5 text-[color:var(--shell-ink-muted)] transition hover:bg-white/[0.06] hover:text-[color:var(--shell-ink)]",

  textLink:
    "text-[11px] text-[color:var(--shell-ink-faint)] transition hover:text-[color:var(--accent-soft)]",

  devPanel:
    "border-t border-white/[0.06] bg-black/20 px-3.5 py-3",
  devBox:
    "rounded-[14px] border border-white/10 bg-white/[0.04] px-2.5 py-2",
  devLabel: "text-[10px] uppercase tracking-widest text-[color:var(--shell-ink-faint)]",

  statCard:
    "rounded-[16px] border border-white/10 bg-white/[0.04] px-3.5 py-2.5",

  /** @deprecated */
  surface: "",
  surfaceNudge: "",
  surfacePanel: "",
} as const;
