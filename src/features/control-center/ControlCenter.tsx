import { MacWindow, Sidebar, SidebarItem } from "../../ui";
import { ResizableColumns } from "../../ui/ResizableColumns";
import { useI18n } from "../../i18n";
import { CharacterPanel } from "../character";
import { PerceptionPanel } from "../perception";
import { ReportPanel } from "../report";
import { SettingsPanel } from "../settings";
import { getControlCenterTabs } from "./tabs";
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
  const t = useI18n();
  const { activeTab, selectTab } = useControlCenter();
  const tabs = getControlCenterTabs(t);

  return (
    <MacWindow>
      <ResizableColumns
        sidebar={
          <Sidebar>
            <div
              data-tauri-drag-region
              className="min-w-0 px-3 py-3 max-sm:hidden"
            >
              <div className="truncate text-[13px] font-semibold text-white">
                {t.common.appName}
              </div>
              <div className="mt-0.5 truncate text-[11px] text-white/35">
                {t.common.activeCompanion}
              </div>
            </div>
            {tabs.map((tab) => (
              <SidebarItem
                key={tab.id}
                label={tab.label}
                icon={tab.icon}
                active={activeTab === tab.id}
                onClick={() => selectTab(tab.id)}
              />
            ))}
          </Sidebar>
        }
      >
        <div
          data-tauri-drag-region
          className="h-full min-h-0 overflow-y-auto px-8 py-7 max-sm:px-5 max-sm:py-5"
        >
          {renderPanel(activeTab)}
        </div>
      </ResizableColumns>
    </MacWindow>
  );
}
