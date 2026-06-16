import { reportPanelStyles } from "../ui/panelStyles";

type DailyCareHeroProps = {
  prompt: string;
  onOpenSummary: () => void;
};

export function DailyCareHero({ prompt, onOpenSummary }: DailyCareHeroProps) {
  return (
    <button
      type="button"
      onClick={onOpenSummary}
      className={reportPanelStyles.heroButton}
    >
      <p className={reportPanelStyles.heroPrompt}>{prompt}</p>
    </button>
  );
}
