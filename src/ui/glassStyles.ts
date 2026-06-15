/** Solid macOS-style surfaces — no backdrop-blur or fake glass alpha. */
export const glassStyles = {
  shell: "border border-[#3a3a40] bg-[#1c1c1e]",
  panel: "border border-[#3a3a40] bg-[#252528]",
  panelStrong: "border border-[#48484f] bg-[#2c2c30]",
  row: "border border-[#333338] bg-[#222226] transition hover:border-[#48484f] hover:bg-[#2a2a2e]",
  rowSelected:
    "border-[#0a84ff] bg-[#1a2a40] shadow-[inset_0_0_0_1px_rgba(10,132,255,0.25)]",
  chip: "border border-[#48484f] bg-[#2c2c30]",
  bubble: "border border-[#3a3a40] bg-[#2a2a2e]",
  sidebar: "border-r border-[#2e2e32] bg-[#161618]",
  radiusWindow: "rounded-[28px]",
  radiusPanel: "rounded-[22px]",
  radiusCard: "rounded-[18px]",
  radiusBubble: "rounded-[16px]",
  radiusChip: "rounded-full",
} as const;
