import { MacWindow, Sidebar, SidebarBrand, SidebarItem, WindowDragStrip } from "../../../ui";
import { ResizableColumns } from "../../../ui";
import { useI18n } from "../../../i18n";
import { ProfilePanel } from "../../auth/components/ProfilePanel";
import { useAuth } from "../../auth/hooks/useAuth";
import { CharacterPanel } from "../../character";
import { PerceptionPanel } from "../../perception";
import { ReportPanel } from "../../report";
import { SettingsPanel } from "../../settings";
import { SidebarLogoutButton } from "./SidebarLogoutButton";
import { getControlCenterTabs } from "../lib/tabs";
import type { ControlCenterTab } from "../lib/tabs";
import { useControlCenter } from "../hooks/useControlCenter";

function renderPanel(
  activeTab: ControlCenterTab,
  onOpenSettings: () => void,
) {
  switch (activeTab) {
    case "profile":
      return <ProfilePanel onOpenSettings={onOpenSettings} />;
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
  const { user } = useAuth();
  const { activeTab, selectTab } = useControlCenter();
  const tabs = getControlCenterTabs(t);

  return (
    <MacWindow>
      <ResizableColumns
        sidebar={
          <Sidebar
            brand={
              <SidebarBrand
                name={user?.name ?? t.common.appName}
                subtitle={t.common.activeCompanion}
                avatarUrl={user?.avatarUrl}
                active={activeTab === "profile"}
                onClick={() => selectTab("profile")}
              />
            }
            footer={<SidebarLogoutButton />}
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
        <div
          className="scrollbar-hide h-full min-h-0 flex-col overflow-y-auto px-6 py-5 max-sm:px-4 max-sm:py-4"
        >
          <div className="tauri-no-drag min-h-0 shrink-0">
            {renderPanel(activeTab, () => selectTab("settings"))}
          </div>
          <WindowDragStrip className="mt-4 min-h-10 flex-1" />
        </div>
      </ResizableColumns>
    </MacWindow>
  );
}
