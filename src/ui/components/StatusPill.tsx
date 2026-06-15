import type { ReactNode } from "react";

type StatusPillProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "purple";
};

const toneClass = {
  blue: "border-[#007aff]/20 bg-[#007aff]/10 text-[#64b5f6]",
  green: "border-[#34c759]/20 bg-[#34c759]/10 text-[#8ddb8c]",
  purple: "border-[#bf5af2]/20 bg-[#bf5af2]/10 text-[#d9a6ff]",
};

export function StatusPill({ children, tone = "blue" }: StatusPillProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3.5 py-3 text-[13px] ${toneClass[tone]}`}
    >
      <span className="size-2 rounded-full bg-[#27c93f] shadow-[0_0_8px_#27c93f]" />
      <span>{children}</span>
    </div>
  );
}
