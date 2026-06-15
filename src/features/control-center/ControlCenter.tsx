import { MacWindow, Sidebar, SidebarBrand, SidebarItem, WindowDragStrip } from "../../ui";
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
          <Sidebar
            brand={
              <SidebarBrand
                appName={t.common.appName}
                subtitle={t.common.activeCompanion}
              />
            }
          >
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
        <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 py-5 max-sm:px-4 max-sm:py-4">
          <div className="app-no-drag min-h-0 shrink-0">
            {renderPanel(activeTab)}
          </div>
          <WindowDragStrip className="mt-4 min-h-10 flex-1" />
        </div>
      </ResizableColumns>
    </MacWindow>
  );
}
