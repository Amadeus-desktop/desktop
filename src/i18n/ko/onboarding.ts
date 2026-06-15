import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "로그인",
    permissions: "권한",
    setup: "시작하기",
  },
  permissions: {
    headline: "화면 맥락 권한이 필요해요",
    subheadline:
      "Amadeus는 화면을 저장하지 않고, 필요한 순간에만 짧게 읽어 맥락을 보강합니다.",
    bullets: [
      "상시 녹화·저장하지 않습니다",
      "민감한 창에서는 캡처하지 않습니다",
      "설정에서 언제든 끌 수 있습니다",
    ],
    screenStatus: "화면 기록",
    ocrStatus: "OCR",
    granted: "허용됨",
    needed: "필요",
    unavailable: "사용 불가",
    checking: "확인 중…",
    openSettings: "시스템 설정 열기",
    checkAgain: "다시 확인",
    next: "다음",
    skip: "나중에 — 기본 모드로 계속",
  },
  setup: {
    headline: "함께할 동반자를 골라주세요",
    subheadline: "응답 방식과 페르소나는 설정에서 바꿀 수 있어요.",
    modelLabel: "응답 방식",
    modelApi: "Cloud API",
    modelLocal: "기기 Local",
    modelLocalHint: "모델 경로는 설정 → 고급에서 지정할 수 있어요.",
    personaLabel: "페르소나",
    continue: "시작하기",
  },
};
