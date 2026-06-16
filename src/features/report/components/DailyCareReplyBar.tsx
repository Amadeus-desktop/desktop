import type { DailyCareReply } from "../lib/dailyCareMessageScript";
import { dailyCareStyles } from "../ui/reportStyles";

type DailyCareReplyBarProps = {
  replies: DailyCareReply[];
  onSelect: (reply: DailyCareReply) => void;
};

export function DailyCareReplyBar({ replies, onSelect }: DailyCareReplyBarProps) {
  if (replies.length === 0) {
    return null;
  }

  return (
    <div className={dailyCareStyles.replyBar}>
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          className={dailyCareStyles.replyOption}
          onClick={() => onSelect(reply)}
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
}
