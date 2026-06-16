import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon } from "../ui/icons";
import { LocalTimeline } from "../dev/LocalTimeline";
import type { TimelineEvent } from "../../timeline/types";

type DailyCareNotePreviewProps = {
  timelineEvents: TimelineEvent[];
  devToolsOpen: boolean;
  labels: CompanionLocale;
  onClose: () => void;
};

export function DailyCareNotePreview({
  timelineEvents,
  devToolsOpen,
  labels,
  onClose,
}: DailyCareNotePreviewProps) {
  return (
    <section className={companionStyles.chatPanel}>
      <header className={companionStyles.chatHeader}>
        <div className="min-w-0 flex-1">
          <p className={companionStyles.chatStatus}>{labels.dailyCare.subtitle}</p>
          <h2 className={companionStyles.chatTitle}>{labels.dailyCare.title}</h2>
        </div>
        <button
          type="button"
          aria-label={labels.dailyCare.close}
          onClick={onClose}
          className={companionStyles.iconButton}
        >
          <CloseIcon className="size-4" />
        </button>
      </header>

      <div className={companionStyles.chatBody}>
        <div className="space-y-4">
          <p className="max-w-[28ch] text-[13px] leading-relaxed text-[color:var(--shell-ink)]">
            {labels.dailyCare.intro}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <CareStat
              label={labels.dailyCare.togetherTime}
              value={labels.dailyCare.togetherTimeValue}
            />
            <CareStat
              label={labels.dailyCare.noteCount}
              value={labels.dailyCare.noteCountValue}
            />
          </div>

          <section className={companionStyles.statCard}>
            <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
              {labels.dailyCare.keywords}
            </p>
            <p className="mt-1 text-[13px] font-medium text-[color:var(--shell-ink)]">
              {labels.dailyCare.keywordValue}
            </p>
          </section>

          <section className={companionStyles.statCard}>
            <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
              {labels.dailyCare.closing}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--shell-ink)]">
              {labels.dailyCare.closingMessage}
            </p>
          </section>
        </div>
      </div>

      {devToolsOpen ? (
        <div className={companionStyles.devPanel}>
          <LocalTimeline events={timelineEvents} labels={labels.dev} />
        </div>
      ) : null}
    </section>
  );
}

type CareStatProps = {
  label: string;
  value: string;
};

function CareStat({ label, value }: CareStatProps) {
  return (
    <div className={companionStyles.statCard}>
      <p className="text-[11px] text-[color:var(--shell-ink-faint)]">{label}</p>
      <p className="mt-1 text-[13px] font-medium text-[color:var(--shell-ink)]">{value}</p>
    </div>
  );
}
