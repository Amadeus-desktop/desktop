import type { ReactNode } from "react";
import { Group, Panel, Separator, type Layout } from "react-resizable-panels";
import { cn } from "../../lib/utils/cn";
import { useMatchMedia } from "../../lib/hooks/useMatchMedia";
import {
  readControlCenterPanelLayout,
  writeControlCenterPanelLayout,
} from "../layout/controlCenterPreferences";
import {
  APP_SHELL_LAYOUT_ID,
  APP_SHELL_PANEL_IDS,
  defaultAppShellLayout,
  mainPanelPolicy,
  sidebarPanelPolicy,
} from "../layout/appShellLayout";

type ResizableColumnsProps = {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ResizableColumns({
  sidebar,
  children,
  className,
}: ResizableColumnsProps) {
  const isCompactLayout = useMatchMedia("(max-width: 640px)");
  const defaultLayout = readControlCenterPanelLayout() ?? defaultAppShellLayout;

  return (
    <Group
      id={APP_SHELL_LAYOUT_ID}
      orientation="horizontal"
      disabled={isCompactLayout}
      className={cn("h-full w-full min-h-0", className)}
      defaultLayout={defaultLayout}
      onLayoutChanged={(layout: Layout) => {
        writeControlCenterPanelLayout(layout);
      }}
      resizeTargetMinimumSize={{ fine: 12, coarse: 28 }}
    >
      <Panel
        id={APP_SHELL_PANEL_IDS.sidebar}
        defaultSize={sidebarPanelPolicy.defaultSize}
        minSize={sidebarPanelPolicy.minSize}
        maxSize={sidebarPanelPolicy.maxSize}
        groupResizeBehavior={sidebarPanelPolicy.groupResizeBehavior}
        className="min-h-0"
      >
        {sidebar}
      </Panel>
      <Separator className="tauri-no-drag w-px bg-white/10 transition hover:bg-white/20" />
      <Panel
        id={APP_SHELL_PANEL_IDS.main}
        minSize={mainPanelPolicy.minSize}
        groupResizeBehavior={mainPanelPolicy.groupResizeBehavior}
        className="min-h-0"
      >
        {children}
      </Panel>
    </Group>
  );
}

/** Alias for clearer intent at call sites. */
export { ResizableColumns as AppShellLayout };
