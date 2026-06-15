import type { ReactNode } from "react";
import { glassStyles } from "./glassStyles";

type SettingRowProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function SettingRow({ title, subtitle, children }: SettingRowProps) {
  return (
    <div
      className={`mb-1.5 flex items-center justify-between gap-3 px-3 py-2.5 ${glassStyles.row} ${glassStyles.radiusCard}`}
    >
      <div className="min-w-0">
        <div className="text-xs font-medium text-white">{title}</div>
        <div className="mt-0.5 text-[10px] leading-4 text-white/42">{subtitle}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
