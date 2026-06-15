import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Together",
  title: "함께하기 설정",
  description: "조용히 곁에서 지켜보는 방식을 정해요. 민감한 화면은 자동으로 가려집니다.",
  sections: {
    basics: "기본",
    details: "자세히",
  },
  analysis: {
    label: "곁에서 함께 있기",
    subtitle: "지금 하는 일을 조용히 파악해 말 걸 타이밍을 맞춰요",
    switchLabel: "곁에서 함께 있기",
  },
  proactiveTrigger: {
    label: "먼저 말 걸기",
    subtitle: "오래 멈추거나 흐름이 끊길 때 은은하게 다가가요",
    switchLabel: "먼저 말 걸기",
  },
  privacyFilter: {
    label: "민감한 화면 가리기",
    subtitle: "비밀번호, 금융, 메신저 화면은 분석하지 않아요",
    switchLabel: "민감한 화면 가리기",
  },
  privacyKeywords: {
    label: "추가로 가릴 단어",
    subtitle: "쉼표로 구분해 더 숨기고 싶은 패턴을 적어요",
    inputLabel: "가릴 단어",
  },
  liveContext: {
    activeApp: "지금 쓰는 앱",
    windowTitle: "창 이름",
    stateSync: "상태",
    category: "분류",
  },
  privacyCard: {
    title: "개인정보 보호",
    description: "계정, 비밀번호, 주민번호 패턴은 컨텍스트에서 제외합니다.",
    active: "켜짐",
    inactive: "꺼짐",
    blocked: "가림",
    screenPermission: "화면 권한",
    permissionGranted: "허용됨",
    permissionNeeded: "확인 필요",
    sensitiveState: "민감 상태",
    passed: "통과",
    reasons: {
      password_manager: "비밀번호",
      finance: "금융",
      messaging: "메신저",
      email: "이메일",
      government: "정부/인증",
      authentication: "인증",
      custom_keyword: "사용자 키워드",
    },
  },
  status: {
    sensitiveBlocked: "민감한 화면이라 쉬는 중",
    analysisWaiting: "곁에서 지켜보는 중",
    analysisPaused: "잠시 쉬는 중",
    analysisLoading: "상태를 확인하는 중",
    analysisError: "상태를 불러오지 못했어요",
  },
  advanced: {
    toggle: "자세히 보기",
    hint: "실시간 화면 상태와 필터 상세",
  },
  contextLabels: {
    idleActive: "활성 ({seconds}초 idle)",
    idlePaused: "유휴 ({minutes}분 idle)",
    categories: {
      work: "업무 앱",
      non_work: "비업무 앱",
      unknown: "미분류",
    },
  },
};
