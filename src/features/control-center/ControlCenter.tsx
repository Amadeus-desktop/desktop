import { MacWindow } from "../../ui/MacWindow";
import { Sidebar } from "../../ui/Sidebar";
import { SidebarItem } from "../../ui/SidebarItem";
import { CharacterPanel } from "../character/CharacterPanel";
import { PerceptionPanel } from "../perception/PerceptionPanel";
import { ReportPanel } from "../report/ReportPanel";
import { SettingsPanel } from "../settings/SettingsPanel";
import { useControlCenter } from "./hooks/useControlCenter";
import { controlCenterTabs } from "./model/tabs";
import type { ControlCenterTab } from "./model/tabs";

function renderPanel(activeTab: ControlCenterTab) {
  switch (activeTab) {
    case "character":
      return <CharacterPanel />;
    case "settings":
      return <SettingsPanel />;
    case "perception":
      return <PerceptionPanel />;
    case "report":
      return <ReportPanel />;
    default:
      return <CharacterPanel />;
  }
}

export function ControlCenter() {
  const { activeTab, selectTab } = useControlCenter();

  return (
    <MacWindow>
      <Sidebar>
        <div className="min-w-0 px-3 py-3 max-sm:hidden">
          <div className="truncate text-[13px] font-semibold text-white">
            Amadeus
          </div>
          <div className="mt-0.5 truncate text-[11px] text-white/35">
            Active Companion
          </div>
        </div>
        {controlCenterTabs.map((tab) => (
          <SidebarItem
            key={tab.id}
            label={tab.label}
            icon={tab.icon}
            active={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
          />
        ))}
      </Sidebar>
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-7 max-sm:px-5 max-sm:py-5">
        {renderPanel(activeTab)}
      </div>
    </MacWindow>
  );
}
