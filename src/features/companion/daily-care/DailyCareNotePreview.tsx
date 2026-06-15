import type { CompanionLocale } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon } from "../ui/icons";
import { CompanionPanelLayout } from "../chat/components/CompanionPanelLayout";
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
    <CompanionPanelLayout
      header={
        <header className={companionStyles.header}>
          <div>
            <p className={companionStyles.headerSubtitle}>
              {labels.dailyCare.subtitle}
            </p>
            <h2 className={companionStyles.headerTitle}>
              {labels.dailyCare.title}
            </h2>
          </div>
          <button
            type="button"
            aria-label={labels.dailyCare.close}
            onClick={onClose}
            className={companionStyles.iconButton}
          >
            <CloseIcon />
          </button>
        </header>
      }
      dev={
        devToolsOpen ? (
          <LocalTimeline events={timelineEvents} labels={labels.dev} />
        ) : undefined
      }
    >
      <div className="min-h-0 space-y-4 overflow-y-auto px-4 py-4">
        <p className="max-w-[28ch] text-chat-base leading-relaxed text-chat-ink dark:text-chat-ink-dark">
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
          <p className="text-chat-xs text-chat-muted dark:text-chat-muted-dark">
            {labels.dailyCare.keywords}
          </p>
          <p className="mt-1 text-chat-sm font-medium text-chat-ink dark:text-chat-ink-dark">
            {labels.dailyCare.keywordValue}
          </p>
        </section>

        <section className={companionStyles.statCard}>
          <p className="text-chat-xs text-chat-muted dark:text-chat-muted-dark">
            {labels.dailyCare.closing}
          </p>
          <p className="mt-1.5 text-chat-sm leading-relaxed text-chat-ink dark:text-chat-ink-dark">
            {labels.dailyCare.closingMessage}
          </p>
        </section>
      </div>
    </CompanionPanelLayout>
  );
}

type CareStatProps = {
  label: string;
  value: string;
};

function CareStat({ label, value }: CareStatProps) {
  return (
    <div className={companionStyles.statCard}>
      <p className="text-chat-xs text-chat-muted dark:text-chat-muted-dark">
        {label}
      </p>
      <p className="mt-1 text-chat-sm font-medium text-chat-ink dark:text-chat-ink-dark">
        {value}
      </p>
    </div>
  );
}
