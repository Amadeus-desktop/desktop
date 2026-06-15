import type { AuthMessages } from "../modules/auth";

export const auth: AuthMessages = {
  onboarding: {
    headline: "오늘 하루, 조용히 함께할 동반자",
    subheadline:
      "Amadeus는 바쁜 화면 너머에서도 가볍게 말을 걸고, 하루를 부드럽게 돌아볼 수 있게 도와줍니다.",
    body: "Google 계정으로 시작하면 설정과 기록을 기기 간에 안전하게 맞출 수 있어요.",
    googleButton: "Google로 계속하기",
    footnote: "계속하면 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.",
  },
  account: {
    section: "계정",
    signedInAs: "Google로 로그인됨",
    logout: "로그아웃",
    loggingOut: "로그아웃 중…",
  },
};
