import { useEffect, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import type { DailyCareReply } from "../lib/messageScript";
import { cn } from "../../../../lib/utils/cn";
import { Button } from "../../../../ui";
import { dailyCareStyles } from "../ui/styles";

type DailyCareReplyBarProps = {
  replies: DailyCareReply[];
  hint?: string;
  customPlaceholder: string;
  customSendLabel: string;
  disabled?: boolean;
  onSelect: (reply: DailyCareReply) => void;
  onCustomSubmit: (text: string) => void;
};

export function DailyCareReplyBar({
  replies,
  hint,
  customPlaceholder,
  customSendLabel,
  disabled = false,
  onSelect,
  onCustomSubmit,
}: DailyCareReplyBarProps) {
  const [draft, setDraft] = useState("");
  const presetReplies = replies.slice(0, 2);

  useEffect(() => {
    setDraft("");
  }, [replies]);

  if (presetReplies.length === 0) {
    return null;
  }

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || disabled) return;
    onCustomSubmit(text);
    setDraft("");
  };

  return (
    <div className={dailyCareStyles.replyBar} aria-label={hint}>
      {hint ? <p className={dailyCareStyles.replyHint}>{hint}</p> : null}
      <div className={dailyCareStyles.replyOptions}>
        {presetReplies.map((reply) => (
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

      <form onSubmit={handleCustomSubmit} className={dailyCareStyles.replyCustomForm}>
        <div className={dailyCareStyles.replyCustomWrap}>
          <input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            disabled={disabled}
            className={dailyCareStyles.replyCustomInput}
            placeholder={customPlaceholder}
            maxLength={240}
            aria-label={customPlaceholder}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={disabled || draft.trim().length === 0}
            aria-label={customSendLabel}
            className={dailyCareStyles.replyCustomSend}
          >
            <Send className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </div>
  );
}
