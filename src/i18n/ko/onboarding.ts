import type { OnboardingMessages } from "../modules/onboarding";

export const onboarding: OnboardingMessages = {
  steps: {
    login: "로그인",
    permissions: "맥락 허용",
    modelRoute: "말하는 방식",
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
    requestFailed: "시스템 설정에서 개인정보 보호 및 보안 > 화면 기록을 열어 Amadeus를 켜 주세요.",
    next: "다음",
    skip: "나중에 할게요",
  },
  modelRoute: {
    headline: "어떻게 곁에서 말해줄까?",
    subheadline: "편한 쪽을 골라주세요. 나중에 바꿀 수 있어요.",
    continue: "다음",
    apiHint: "인터넷만 연결되면 언제든 말해줄 수 있어요.",
    localHint: "이 기기 안에서만 말해요. 밖으로 나가지 않아요.",
    options: {
      api: {
        title: "온라인으로",
        description: "부드럽고 빠르게",
      },
      local: {
        title: "기기 안에서",
        description: "조용히, 나만의 공간",
      },
    },
  },
  setup: {
    headline: "누구와 함께할까요?",
    subheadline: "말투만 달라요. 곁에 있는 마음은 같아요.",
    continue: "곁에 두기",
  },
  preparing: {
    eyebrow: "잠깐만",
    title: "설정 준비 중이에요",
    subtitle: "곁에 맞게 살짝 정리하고 있어요.",
    doneEyebrow: "준비 끝",
    doneTitle: "완료했어요!",
    doneSubtitle: "이제 곁에서 말해줄 준비가 됐어요.",
    doneHint: "잠시 후 시작할게요.",
  },
};
