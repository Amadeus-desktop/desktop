import type { ReactNode } from "react";
import { Group, Panel } from "react-resizable-panels";
import { cn } from "../../../../lib/cn";
import { companionStyles } from "../../ui/styles";

type CompanionPanelLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  accessory?: ReactNode;
  dev?: ReactNode;
  className?: string;
};

export function CompanionPanelLayout({
  header,
  children,
  footer,
  accessory,
  dev,
  className,
}: CompanionPanelLayoutProps) {
  const bodySize = dev ? 52 : accessory ? 58 : 66;
  const devSize = dev ? 18 : 0;
  const accessorySize = accessory ? 6 : 0;
  const footerSize = footer ? 14 : 0;
  const headerSize = 100 - bodySize - devSize - accessorySize - footerSize;

  return (
    <div
      className={cn(
        companionStyles.panel,
        companionStyles.panelSize,
        className,
      )}
    >
      <Group orientation="vertical" className="h-full min-h-0">
        <Panel
          defaultSize={headerSize}
          minSize={10}
          className="min-h-0 overflow-hidden"
        >
          {header}
        </Panel>

        <Panel
          defaultSize={bodySize}
          minSize={24}
          className="min-h-0 overflow-hidden"
        >
          {children}
        </Panel>

        {accessory ? (
          <Panel
            defaultSize={accessorySize}
            minSize={5}
            className="min-h-0 overflow-hidden"
          >
            {accessory}
          </Panel>
        ) : null}

        {dev ? (
          <Panel
            defaultSize={devSize}
            minSize={12}
            className={cn(companionStyles.devPanel, "min-h-0 overflow-auto")}
          >
            {dev}
          </Panel>
        ) : null}

        {footer ? (
          <Panel
            defaultSize={footerSize}
            minSize={10}
            className="min-h-0 overflow-hidden"
          >
            {footer}
          </Panel>
        ) : null}
      </Group>
    </div>
  );
}
