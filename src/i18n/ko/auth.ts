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
  logout: {
    preparing: {
      eyebrow: "잠깐만",
      title: "곁에서 잠시 물러날게요",
      subtitle: "설정을 정리하고 있어요.",
    },
    complete: {
      eyebrow: "정리 끝",
      title: "나갔어요",
      subtitle: "다시 오면 곁에서 기다릴게요.",
      hint: "잠시 후 로그인 화면으로 돌아갈게요.",
    },
  },
  profile: {
    eyebrow: "프로필",
    title: "내 계정",
    description: "Google 계정 정보와 Amadeus에서 보여줄 이름을 관리해요.",
    displayNameLabel: "불러줄 이름",
    displayNameHint: "동반자가 말할 때 사용하는 이름이에요.",
    emailLabel: "이메일",
    openSettings: "일반 설정",
    modelRouteLabel: "말하는 방식",
    modelRouteHint: "온라인으로 말해줄지, 기기 안에서만 말해줄지 골라요.",
  },
};
