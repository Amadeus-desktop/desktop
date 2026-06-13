import { useEffect, useState } from "react";
import { IosSwitch, MacInput, MacSelect, SectionHeading, SettingRow } from "../../ui";
import { modelRouteOptions, talkFrequencyOptions } from "./settings";
import { loadLlamaSidecarStatus, type LlamaSidecarStatus } from "./settingsStore";
import { useSettings } from "./useSettings";

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
    localModelPath,
    setLocalModelPath,
    llamaServerBinaryPath,
    setLlamaServerBinaryPath,
    llamaServerHost,
    setLlamaServerHost,
    llamaServerPort,
    setLlamaServerPort,
    settingsRevision,
  } = useSettings();
  const [sidecarStatus, setSidecarStatus] = useState<LlamaSidecarStatus>({
    configured: false,
    running: false,
    detail: "확인 중",
  });

  useEffect(() => {
    let cancelled = false;

    void loadLlamaSidecarStatus().then((status) => {
      if (!cancelled) {
        setSidecarStatus(status);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    llamaServerBinaryPath,
    llamaServerHost,
    llamaServerPort,
    localModelPath,
    modelRoute,
    settingsRevision,
  ]);

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
      <SettingRow title="GGUF 모델 경로" subtitle="llama.cpp가 로드할 로컬 모델 파일">
        <MacInput
          value={localModelPath ?? ""}
          onChange={(value) => setLocalModelPath(value.trim() || null)}
          label="모델 경로"
        />
      </SettingRow>
      <SettingRow
        title="llama-server 경로"
        subtitle="앱 데이터 sidecars 폴더 안의 실행 파일"
      >
        <MacInput
          value={llamaServerBinaryPath ?? ""}
          onChange={(value) => setLlamaServerBinaryPath(value.trim() || null)}
          label="바이너리 경로"
        />
      </SettingRow>
      <SettingRow title="llama.cpp 서버" subtitle="로컬 sidecar 접속 주소">
        <div className="grid min-w-[260px] grid-cols-[1fr_84px] gap-2">
          <MacInput
            value={llamaServerHost}
            onChange={setLlamaServerHost}
            label="호스트"
          />
          <MacInput
            value={String(llamaServerPort)}
            onChange={(value) => {
              const port = Number(value);
              if (Number.isInteger(port) && port > 0 && port <= 65535) {
                setLlamaServerPort(port);
              }
            }}
            label="포트"
          />
        </div>
      </SettingRow>
      <SettingRow title="로컬 서버 상태" subtitle={sidecarStatus.detail}>
        <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-white/70">
          {sidecarStatus.running
            ? "실행 중"
            : sidecarStatus.configured
              ? "준비됨"
              : "미설정"}
        </span>
      </SettingRow>
    </section>
  );
}
