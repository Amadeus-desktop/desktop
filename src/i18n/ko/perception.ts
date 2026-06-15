import type { PerceptionMessages } from "../modules/perception";

export const perception: PerceptionMessages = {
  eyebrow: "Context Guardrail",
  title: "화면 인지 가이드",
  description: "화면 캡처, 앱 로그, idle 신호를 합쳐 발화 여부를 판단합니다.",
  sections: {
    capture: "Capture",
    liveContext: "Live Context",
  },
  analysis: {
    label: "화면 분석",
    subtitle: "현재 창과 문맥 변화만 짧게 요약",
    switchLabel: "화면 분석",
  },
  proactiveTrigger: {
    label: "능동 발화 큐",
    subtitle: "장기 정체와 딴짓 신호를 발화 후보로 기록",
    switchLabel: "능동 발화 큐",
  },
  privacyFilter: {
    label: "민감정보 필터",
    subtitle: "분석 전 단계에서 로컬 마스킹 수행",
    switchLabel: "민감정보 필터",
  },
  privacyKeywords: {
    label: "사용자 키워드",
    subtitle: "쉼표로 구분해 추가 민감 패턴을 등록합니다",
    inputLabel: "민감 키워드",
  },
  liveContext: {
    activeApp: "현재 앱",
    windowTitle: "창 제목",
    stateSync: "상태 동기화",
    category: "앱 분류",
  },
  privacyCard: {
    title: "개인정보 필터",
    description: "계정, 비밀번호, 주민번호 패턴은 컨텍스트에서 제외합니다.",
    active: "활성",
    inactive: "비활성",
    blocked: "차단",
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
    sensitiveBlocked: "민감 컨텍스트 차단",
    analysisWaiting: "분석 대기 중",
    analysisPaused: "분석 일시 중지",
    analysisLoading: "컨텍스트 갱신 중",
    analysisError: "컨텍스트 불러오기 실패",
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
