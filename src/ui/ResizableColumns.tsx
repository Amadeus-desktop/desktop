import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../lib/cn";

type ResizableColumnsProps = {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarDefaultSize?: number;
  className?: string;
};

export function ResizableColumns({
  sidebar,
  children,
  sidebarDefaultSize = 22,
  className,
}: ResizableColumnsProps) {
  return (
    <Group
      orientation="horizontal"
      className={cn("h-full w-full min-h-0", className)}
    >
      <Panel
        defaultSize={sidebarDefaultSize}
        minSize={16}
        maxSize={34}
        className="min-h-0"
      >
        {sidebar}
      </Panel>
      <Separator className="w-px bg-white/10 transition hover:bg-white/20" />
      <Panel
        defaultSize={100 - sidebarDefaultSize}
        minSize={45}
        className="min-h-0"
      >
        {children}
      </Panel>
    </Group>
  );
}
