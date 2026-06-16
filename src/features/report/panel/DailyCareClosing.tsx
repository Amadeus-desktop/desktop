import { shellText } from "../../../ui/theme/shellStyles";
import { reportPanelStyles } from "../ui/panelStyles";

type DailyCareClosingProps = {
  title: string;
  keywordsTitle: string;
  keywords: string[];
  closingNote: string;
};

export function DailyCareClosing({
  title,
  keywordsTitle,
  keywords,
  closingNote,
}: DailyCareClosingProps) {
  return (
    <div className="space-y-2.5">
      <article className={reportPanelStyles.closingCard}>
        <div className={`text-[10px] font-medium uppercase tracking-wide ${shellText.faint}`}>
          {keywordsTitle}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {keywords.map((keyword) => (
            <span key={keyword} className={reportPanelStyles.keywordChip}>
              {keyword}
            </span>
          ))}
        </div>
      </article>
      <article className={reportPanelStyles.closingAccentCard}>
        <div className={`text-[10px] font-medium uppercase tracking-wide ${shellText.faint}`}>
          {title}
        </div>
        <p className={`mt-2 text-[13px] leading-6 ${shellText.muted}`}>{closingNote}</p>
      </article>
    </div>
  );
}
