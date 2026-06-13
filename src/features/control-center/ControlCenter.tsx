import { MacWindow, Sidebar, SidebarItem } from "../../ui";
import { CharacterPanel } from "../character";
import { PerceptionPanel } from "../perception";
import { ReportPanel } from "../report";
import { SettingsPanel } from "../settings";
import { controlCenterTabs } from "./tabs";
import type { ControlCenterTab } from "./tabs";
import { useControlCenter } from "./useControlCenter";

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
        <div data-tauri-drag-region className="min-w-0 px-3 py-3 max-sm:hidden">
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
      <div
        data-tauri-drag-region
        className="min-w-0 flex-1 overflow-y-auto px-8 py-7 max-sm:px-5 max-sm:py-5"
      >
        {renderPanel(activeTab)}
      </div>
    </MacWindow>
  );
}
