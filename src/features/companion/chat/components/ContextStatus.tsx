import type { CompanionMode } from "../../types";
import type { CompanionLocale } from "../../../../i18n";
import { companionStyles } from "../../ui/styles";

type ContextStatusProps = {
  mode: CompanionMode;
  labels: CompanionLocale["status"];
};

export function ContextStatus({ mode, labels }: ContextStatusProps) {
  const label =
    mode === "deep"
      ? labels.deep
      : mode === "pocket"
        ? labels.pocket
        : mode === "daily_care"
          ? labels.dailyCare
          : mode === "sleep"
            ? labels.sleep
            : labels.quiet;

  return <p className={companionStyles.headerSubtitle}>{label}</p>;
}
