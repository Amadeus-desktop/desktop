import type { AuthMessages } from "../modules/auth";

export const auth: AuthMessages = {
  onboarding: {
    headline: "조용히 함께하는 동반자",
    subheadline: "Google로 시작해 설정과 기록을 기기에 맞춰보세요.",
    googleButton: "Google로 계속하기",
    footnote: "계속하면 이용약관 및 개인정보 처리방침에 동의합니다.",
  },
  account: {
    section: "계정",
    signedInAs: "Google로 로그인됨",
    logout: "로그아웃",
    loggingOut: "로그아웃 중…",
  },
  profile: {
    eyebrow: "프로필",
    title: "내 계정",
    description: "Google 계정 정보와 Amadeus에서 보여줄 이름을 관리해요.",
    displayNameLabel: "불러줄 이름",
    displayNameHint: "동반자가 말할 때 사용하는 이름이에요.",
    emailLabel: "이메일",
    openSettings: "일반 설정",
    modelRouteLabel: "응답 방식",
    modelRouteHint: "클라우드 API 또는 로컬 LLM으로 동반자가 말해요.",
  },
};
