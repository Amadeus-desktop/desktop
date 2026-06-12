import { IosSwitch } from "../../ui/IosSwitch";
import { SectionHeading } from "../../ui/SectionHeading";
import { SettingRow } from "../../ui/SettingRow";
import { StatusPill } from "../../ui/StatusPill";
import { LiveContextLog } from "./components/LiveContextLog";
import { PrivacyFilterCard } from "./components/PrivacyFilterCard";
import { usePerceptionStatus } from "./hooks/usePerceptionStatus";

export function PerceptionPanel() {
  const {
    analysisEnabled,
    setAnalysisEnabled,
    proactiveTriggerEnabled,
    setProactiveTriggerEnabled,
    privacyFilterEnabled,
    setPrivacyFilterEnabled,
    liveContext,
  } = usePerceptionStatus();

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">Context Guardrail</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          화면 인지 가이드
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          화면 캡처, 앱 로그, idle 신호를 합쳐 발화 여부를 판단합니다.
        </p>
      </header>

      <SectionHeading>Capture</SectionHeading>
      <SettingRow title="화면 분석" subtitle="현재 창과 문맥 변화만 짧게 요약">
        <IosSwitch
          checked={analysisEnabled}
          onChange={setAnalysisEnabled}
          label="화면 분석"
        />
      </SettingRow>
      <SettingRow title="능동 발화 큐" subtitle="장기 정체와 딴짓 신호를 발화 후보로 기록">
        <IosSwitch
          checked={proactiveTriggerEnabled}
          onChange={setProactiveTriggerEnabled}
          label="능동 발화 큐"
        />
      </SettingRow>
      <SettingRow title="민감정보 필터" subtitle="분석 전 단계에서 로컬 마스킹 수행">
        <IosSwitch
          checked={privacyFilterEnabled}
          onChange={setPrivacyFilterEnabled}
          label="민감정보 필터"
        />
      </SettingRow>

      <SectionHeading>Live Context</SectionHeading>
      <LiveContextLog liveContext={liveContext} />

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_180px] gap-3 max-sm:grid-cols-1">
        <PrivacyFilterCard enabled={privacyFilterEnabled} />
        <StatusPill tone={analysisEnabled ? "green" : "blue"}>
          {analysisEnabled ? "분석 대기 중" : "분석 일시 중지"}
        </StatusPill>
      </div>
    </section>
  );
}
