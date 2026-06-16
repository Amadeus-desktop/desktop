import { dailyCareStyles } from "../ui/reportStyles";

type DailyCareHeroProps = {
  prompt: string;
  onOpenSummary: () => void;
};

export function DailyCareHero({ prompt, onOpenSummary }: DailyCareHeroProps) {
  return (
    <button
      type="button"
      onClick={onOpenSummary}
      className={dailyCareStyles.heroButton}
    >
      <p className={dailyCareStyles.heroPrompt}>{prompt}</p>
    </button>
  );
}
