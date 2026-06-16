import type { DailyCareReply } from "../lib/dailyCareMessageScript";
import { cn } from "../../../lib/utils/cn";
import { dailyCareStyles } from "../ui/reportStyles";

type DailyCareReplyBarProps = {
  replies: DailyCareReply[];
  hint?: string;
  disabled?: boolean;
  onSelect: (reply: DailyCareReply) => void;
};

export function DailyCareReplyBar({
  replies,
  hint,
  disabled = false,
  onSelect,
}: DailyCareReplyBarProps) {
  if (replies.length === 0) {
    return null;
  }

  return (
    <div className={dailyCareStyles.replyBar} aria-label={hint}>
      {hint ? <p className={dailyCareStyles.replyHint}>{hint}</p> : null}
      <div className={dailyCareStyles.replyOptions}>
        {replies.map((reply) => (
          <button
            key={reply.id}
            type="button"
            disabled={disabled}
            className={cn(
              dailyCareStyles.replyOption,
              disabled && "cursor-not-allowed opacity-45",
            )}
            onClick={() => onSelect(reply)}
          >
            {reply.label}
          </button>
        ))}
      </div>
    </div>
  );
}
