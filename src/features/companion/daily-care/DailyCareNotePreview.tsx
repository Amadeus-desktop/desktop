import type { CompanionLocale } from "../../../i18n";
import { useI18n } from "../../../i18n";
import { companionStyles } from "../ui/styles";
import { CloseIcon } from "../ui/icons";
import { LocalTimeline } from "../dev/LocalTimeline";
import type { TimelineEvent, WorkSession } from "../../timeline/types";
import { buildDailyCareInsight } from "../../report/lib/insight";
import { buildDailyCareStats } from "./dailyCareStats";

type DailyCareNotePreviewProps = {
  timelineEvents: TimelineEvent[];
  workSessions: WorkSession[];
  devToolsOpen: boolean;
  labels: CompanionLocale;
  onClose: () => void;
};

export function DailyCareNotePreview({
  timelineEvents,
  workSessions,
  devToolsOpen,
  labels,
  onClose,
}: DailyCareNotePreviewProps) {
  const locale = useI18n();
  const stats = buildDailyCareStats(timelineEvents, locale);
  const insight = buildDailyCareInsight(timelineEvents, locale, { workSessions });

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

          <section className={companionStyles.statCard}>
            <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
              {locale.report.summaryOverlay.steps.narrative.eyebrow}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--shell-ink)]">
              {insight.companionNarrative}
            </p>
          </section>

          {insight.activityDetails[0] ? (
            <section className={companionStyles.statCard}>
              <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
                {locale.report.summaryOverlay.steps.activity.eyebrow}
              </p>
              <p className="mt-1 text-[13px] font-medium text-[color:var(--shell-ink)]">
                {insight.activityDetails[0].label}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--shell-ink-muted)]">
                {insight.activityDetails[0].summary}
              </p>
            </section>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <CareStat
              label={labels.dailyCare.togetherTime}
              value={stats.togetherTimeValue}
            />
            <CareStat
              label={labels.dailyCare.noteCount}
              value={stats.noteCountValue}
            />
          </div>

          <section className={companionStyles.statCard}>
            <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
              {labels.dailyCare.keywords}
            </p>
            <p className="mt-1 text-[13px] font-medium text-[color:var(--shell-ink)]">
              {insight.keywords.join(" · ")}
            </p>
          </section>

          <section className={companionStyles.statCard}>
            <p className="text-[11px] text-[color:var(--shell-ink-faint)]">
              {labels.dailyCare.closing}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--shell-ink)]">
              {insight.closingNote}
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
