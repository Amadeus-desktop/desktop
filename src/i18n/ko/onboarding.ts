import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "로그인",
    permissions: "맥락 허용",
    modelRoute: "응답 방식",
    setup: "동반자",
  },
  permissions: {
    headline: "곁에 있기 위해 허용이 필요해요",
    subheadline: "화면을 저장하지 않아요. 필요할 때만 잠깐 읽어요.",
    promiseChips: ["저장 안 함", "민감한 창은 보지 않아요"],
    statusLabel: "화면 기록",
    granted: "허용됨",
    needed: "필요",
    checking: "확인 중…",
    requestAccess: "허용하기",
    settingsHint: "시스템 설정이 열리면 Amadeus를 켜 주세요.",
    next: "다음",
    skip: "나중에 할게요",
  },
  modelRoute: {
    headline: "어떻게 말해줄까요?",
    subheadline: "클라우드 API와 로컬 LLM 중에서 곁에서 말해줄 방식을 고르세요.",
    continue: "다음",
    apiHint: "인터넷이 연결되면 클라우드 API로 응답해요. 설정에서 언제든 바꿀 수 있어요.",
    localHint: "기기에서 llama.cpp로 응답해요. 모델 경로는 일반 설정에서 조정할 수 있어요.",
    options: {
      api: {
        title: "클라우드 API",
        description: "빠르고 안정적인 응답",
      },
      local: {
        title: "로컬 LLM",
        description: "기기 안에서만 처리",
      },
    },
  },
  setup: {
    headline: "누구와 함께할까요?",
    subheadline: "말투만 달라요. 곁에 있는 마음은 같아요.",
    continue: "곁에 두기",
  },
};
