import { cn } from "../../../../lib/cn";
import { companionStyles } from "../../ui/styles";

type ChatAvatarProps = {
  className?: string;
};

export function ChatAvatar({ className }: ChatAvatarProps) {
  return (
    <div className={cn(companionStyles.avatar, className)} aria-hidden="true">
      <div className="flex h-full w-full items-center justify-center">
        <div className={companionStyles.avatarDot} />
      </div>
    </div>
  );
}
