import { cn } from "../../lib/utils/cn";
import { shellText } from "../theme/shellStyles";

type SectionHeadingProps = {
  children: string;
  className?: string;
};

export function SectionHeading({ children, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-2.5 mt-5 flex items-center gap-2 px-0.5", className)}>
      <span
        className="h-3.5 w-0.5 shrink-0 rounded-full bg-[color:rgb(var(--accent-rgb)/0.65)]"
        aria-hidden="true"
      />
      <h3 className={cn("text-[11px] font-semibold tracking-wide", shellText.muted)}>
        {children}
      </h3>
    </div>
  );
}
