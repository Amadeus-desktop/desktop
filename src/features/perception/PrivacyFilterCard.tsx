import type { AppLocale } from "../../i18n";
import type {
  PrivacyAssessment,
  ScreenCapturePermissionStatus,
} from "../context/types";

type PrivacyFilterCardProps = {
  enabled: boolean;
  assessment: PrivacyAssessment | null;
  permissionStatus: ScreenCapturePermissionStatus | null;
  labels: AppLocale["perception"]["privacyCard"];
};

export function PrivacyFilterCard({
  enabled,
  assessment,
  permissionStatus,
  labels,
}: PrivacyFilterCardProps) {
  const sensitive = assessment?.isSensitive ?? false;

  return (
    <article className="rounded-lg border border-white/6 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{labels.title}</h3>
          <p className="mt-1 text-[11px] leading-4 text-white/42">
            {labels.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            enabled && !sensitive
              ? "bg-[#34c759]/14 text-[#8ddb8c]"
              : sensitive
                ? "bg-[#ff453a]/14 text-[#ff9f9a]"
              : "bg-white/8 text-white/45"
          }`}
        >
          {sensitive ? labels.blocked : enabled ? labels.active : labels.inactive}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] leading-4 text-white/42 max-sm:grid-cols-1">
        <div>
          {labels.screenPermission}:{" "}
          <span className={permissionStatus?.granted ? "text-[#8ddb8c]" : ""}>
            {permissionStatus?.granted
              ? labels.permissionGranted
              : labels.permissionNeeded}
          </span>
        </div>
        <div>
          {labels.sensitiveState}:{" "}
          <span className={sensitive ? "text-[#ff9f9a]" : "text-[#8ddb8c]"}>
            {sensitive
              ? reasonLabel(assessment?.reason, labels)
              : labels.passed}
          </span>
        </div>
      </div>
    </article>
  );
}

function reasonLabel(
  reason: PrivacyAssessment["reason"] | undefined,
  labels: AppLocale["perception"]["privacyCard"],
) {
  return reason ? labels.reasons[reason] : labels.blocked;
}
