import { IosSwitch } from "../../ui/IosSwitch";
import { MacInput } from "../../ui/MacInput";
import { MacSelect } from "../../ui/MacSelect";
import { SectionHeading } from "../../ui/SectionHeading";
import { SettingRow } from "../../ui/SettingRow";
import { useSettings } from "./hooks/useSettings";
import { modelRouteOptions, talkFrequencyOptions } from "./model/settings";

export function SettingsPanel() {
  const {
    talkFrequency,
    setTalkFrequency,
    modelRoute,
    setModelRoute,
    localFallbackEnabled,
    setLocalFallbackEnabled,
    nickname,
    setNickname,
    nightCareEnabled,
    setNightCareEnabled,
  } = useSettings();

  return (
    <section className="tab-panel-enter">
      <header>
        <p className="text-xs font-medium text-[#64b5f6]">Preferences</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight text-white">
          일반 설정
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-white/45">
          능동 발화, 모델 라우팅, 야간 배려 같은 기본 동작을 정합니다.
        </p>
      </header>

      <SectionHeading>Conversation</SectionHeading>
      <SettingRow title="말 걸기 빈도" subtitle="업무 흐름을 방해하지 않는 기본 강도">
        <MacSelect
          value={talkFrequency}
          options={talkFrequencyOptions}
          onChange={setTalkFrequency}
        />
      </SettingRow>
      <SettingRow title="호칭" subtitle="말풍선과 채팅에서 사용할 이름">
        <MacInput value={nickname} onChange={setNickname} label="호칭" />
      </SettingRow>
      <SettingRow title="야간 배려" subtitle="늦은 시간에는 짧고 낮은 톤으로 반응">
        <IosSwitch
          checked={nightCareEnabled}
          onChange={setNightCareEnabled}
          label="야간 배려"
        />
      </SettingRow>

      <SectionHeading>Model</SectionHeading>
      <SettingRow title="LLM 라우팅" subtitle="기본 응답 경로와 로컬 실행 우선순위">
        <MacSelect
          value={modelRoute}
          options={modelRouteOptions}
          onChange={setModelRoute}
        />
      </SettingRow>
      <SettingRow title="로컬 대체" subtitle="API 연결 실패 시 llama.cpp 경로로 전환">
        <IosSwitch
          checked={localFallbackEnabled}
          onChange={setLocalFallbackEnabled}
          label="로컬 LLM 대체"
        />
      </SettingRow>
    </section>
  );
}
