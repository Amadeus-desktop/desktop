import { BarChart3, Eye, Settings, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppLocale } from "../../../i18n";

export type ControlCenterTab =
  | "character"
  | "settings"
  | "perception"
  | "report"
  | "profile";

export type ControlCenterTabItem = {
  id: ControlCenterTab;
  label: string;
  icon: LucideIcon;
};

export function getControlCenterTabs(locale: AppLocale): ControlCenterTabItem[] {
  return [
    { id: "character", label: locale.controlCenter.tabs.character, icon: UserRound },
    { id: "settings", label: locale.controlCenter.tabs.settings, icon: Settings },
    { id: "perception", label: locale.controlCenter.tabs.perception, icon: Eye },
    { id: "report", label: locale.controlCenter.tabs.report, icon: BarChart3 },
  ];
}
