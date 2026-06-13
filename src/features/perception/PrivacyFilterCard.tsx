import type {
  PrivacyAssessment,
  ScreenCapturePermissionStatus,
} from "../context/types";

type PrivacyFilterCardProps = {
  enabled: boolean;
  assessment: PrivacyAssessment | null;
  permissionStatus: ScreenCapturePermissionStatus | null;
};

export function PrivacyFilterCard({
  enabled,
  assessment,
  permissionStatus,
}: PrivacyFilterCardProps) {
  const sensitive = assessment?.isSensitive ?? false;

  return (
    <article className="rounded-lg border border-white/6 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">개인정보 필터</h3>
          <p className="mt-1 text-[11px] leading-4 text-white/42">
            계정, 비밀번호, 주민번호 패턴은 컨텍스트에서 제외합니다.
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
          {sensitive ? "차단" : enabled ? "활성" : "비활성"}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] leading-4 text-white/42 max-sm:grid-cols-1">
        <div>
          화면 권한:{" "}
          <span className={permissionStatus?.granted ? "text-[#8ddb8c]" : ""}>
            {permissionStatus?.granted ? "허용됨" : "확인 필요"}
          </span>
        </div>
        <div>
          민감 상태:{" "}
          <span className={sensitive ? "text-[#ff9f9a]" : "text-[#8ddb8c]"}>
            {sensitive ? reasonLabel(assessment?.reason) : "통과"}
          </span>
        </div>
      </div>
    </article>
  );
}

function reasonLabel(reason: PrivacyAssessment["reason"] | undefined) {
  const labelByReason: Record<NonNullable<PrivacyAssessment["reason"]>, string> =
    {
      password_manager: "비밀번호",
      finance: "금융",
      messaging: "메신저",
      email: "이메일",
      government: "정부/인증",
      authentication: "인증",
      custom_keyword: "사용자 키워드",
    };

  return reason ? labelByReason[reason] : "민감";
}
