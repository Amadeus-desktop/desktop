type PrivacyFilterCardProps = {
  enabled: boolean;
};

export function PrivacyFilterCard({ enabled }: PrivacyFilterCardProps) {
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
            enabled
              ? "bg-[#34c759]/14 text-[#8ddb8c]"
              : "bg-white/8 text-white/45"
          }`}
        >
          {enabled ? "활성" : "비활성"}
        </span>
      </div>
    </article>
  );
}
