import { cn } from "../../lib/utils/cn";
import { windowDragRegionProps } from "../lib/windowDrag";
import { glassStyles, shellText } from "../theme/shellStyles";

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  enableWindowDrag?: boolean;
};

export function PanelHeader({
  eyebrow,
  title,
  description,
  enableWindowDrag = false,
}: PanelHeaderProps) {
  return (
    <header
      {...(enableWindowDrag ? windowDragRegionProps : {})}
      className={cn(
        "mb-4 select-none border-b border-[color:var(--shell-border-subtle)] pb-4",
        glassStyles.panel,
        glassStyles.radiusCard,
        "px-4 py-3",
        enableWindowDrag && "cursor-default touch-none [&_*]:select-none",
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-[color:rgb(var(--accent-rgb)/0.85)]">
        {eyebrow}
      </p>
      <h1 className={cn("mt-1 text-lg font-semibold leading-snug", shellText.primary)}>
        {title}
      </h1>
      <p className={cn("mt-1 max-w-2xl text-xs leading-5", shellText.faint)}>
        {description}
      </p>
    </header>
  );
}
