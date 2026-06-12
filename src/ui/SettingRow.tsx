import type { ReactNode } from "react";

type SettingRowProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function SettingRow({ title, subtitle, children }: SettingRowProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-white">{title}</div>
        <div className="mt-0.5 text-[11px] leading-4 text-white/40">
          {subtitle}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

