import { BarChart3, Eye, Settings, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ControlCenterTab = "character" | "settings" | "perception" | "report";

export type ControlCenterTabItem = {
  id: ControlCenterTab;
  label: string;
  icon: LucideIcon;
};

export const controlCenterTabs: ControlCenterTabItem[] = [
  { id: "character", label: "캐릭터 선택", icon: UserRound },
  { id: "settings", label: "일반 설정", icon: Settings },
  { id: "perception", label: "화면 인지 가이드", icon: Eye },
  { id: "report", label: "작업 리포트", icon: BarChart3 },
];
