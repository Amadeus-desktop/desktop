import type { AppLocale } from "../types";

export const base: AppLocale = {
  common: {
    appName: "Amadeus",
    activeCompanion: "Active Companion",
    loading: "불러오는 중…",
    empty: "아직 기록이 없습니다.",
  },
  controlCenter: {
    tabs: {
      character: "캐릭터 선택",
      settings: "일반 설정",
      perception: "화면 인지 가이드",
      report: "작업 리포트",
    },
    sections: {
      character: "Character",
      currentMode: "Current Mode",
    },
  },
  settings: {
    eyebrow: "Preferences",
    title: "일반 설정",
    description: "능동 발화, 모델 라우팅, 야간 배려 같은 기본 동작을 정합니다.",
    sections: {
      conversation: "Conversation",
      model: "Model",
      language: "Language",
    },
    locale: {
      label: "표시 언어",
      subtitle: "앱 UI와 companion 메시지 언어",
      options: {
        ko: "한국어",
        en: "English",
        ja: "日本語",
      },
    },
    talkFrequency: {
      label: "말 걸기 빈도",
      subtitle: "업무 흐름을 방해하지 않는 기본 강도",
      options: {
        quiet: "조용하고 묵묵하게",
        balanced: "적당히 은은하게",
        active: "기운 넘치고 적극적이게",
      },
    },
    nickname: {
      label: "호칭",
      subtitle: "말풍선과 채팅에서 사용할 이름",
      inputLabel: "호칭",
    },
    nightCare: {
      label: "야간 배려",
      subtitle: "늦은 시간에는 짧고 낮은 톤으로 반응",
      switchLabel: "야간 배려",
    },
    modelRoute: {
      label: "LLM 라우팅",
      subtitle: "기본 응답 경로와 로컬 실행 우선순위",
      options: {
        "api-first": "API 우선",
        "local-first": "로컬 우선",
        template: "템플릿",
      },
    },
    localFallback: {
      label: "로컬 대체",
      subtitle: "API 연결 실패 시 llama.cpp 경로로 전환",
      switchLabel: "로컬 LLM 대체",
    },
    localModelPath: {
      label: "GGUF 모델 경로",
      subtitle: "llama.cpp가 로드할 로컬 모델 파일",
      inputLabel: "모델 경로",
    },
    llamaBinaryPath: {
      label: "llama-server 경로",
      subtitle: "앱 데이터 sidecars 폴더 안의 실행 파일",
      inputLabel: "바이너리 경로",
    },
    llamaServer: {
      label: "llama.cpp 서버",
      subtitle: "로컬 sidecar 접속 주소",
      hostLabel: "호스트",
      portLabel: "포트",
    },
    sidecarStatus: {
      label: "로컬 서버 상태",
      running: "실행 중",
      configured: "준비됨",
      unconfigured: "미설정",
      checking: "확인 중",
    },
  },
  character: {
    eyebrow: "Amadeus Persona",
    title: "캐릭터 선택",
    description:
      "작업 흐름에 맞춰 말투와 반응 강도를 조절하는 동반자 프로필입니다.",
    section: "Character",
    currentMode: "Current Mode",
    currentModeTemplate: "{name} 기준으로 말풍선과 채팅 톤을 맞춥니다.",
    profiles: {
      ruda: {
        name: "루다",
        description: "말괄량이 여동생 텐션",
      },
      emilia: {
        name: "에밀리아",
        description: "은근히 챙겨주는 다정함",
      },
      daon: {
        name: "다온",
        description: "차분하고 묵묵한 위로",
      },
    },
  },
  perception: {
    eyebrow: "Context Guardrail",
    title: "화면 인지 가이드",
    description:
      "화면 캡처, 앱 로그, idle 신호를 합쳐 발화 여부를 판단합니다.",
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
    },
  },
  report: {
    eyebrow: "Daily Review",
    title: "작업 리포트",
    description: "오늘의 집중 시간과 발화 개입 이력을 한 화면에서 확인합니다.",
    sections: {
      summary: "Summary",
      timeline: "Timeline",
    },
    metrics: {
      focusTime: "오늘 함께 달린 집중 시간",
      utterances: "companion이 건넨 넌지시 응원",
    },
    timeline: {
      loading: "타임라인을 불러오는 중입니다.",
      empty: "아직 저장된 타임라인이 없습니다.",
    },
    fallback: {
      focusTimeValue: "3시간 45분",
      utterancesValue: "6회",
    },
  },
  companion: {
    presence: {
      open: "아마 열기",
      wake: "아마 깨우기",
      newMessage: "새 메모",
    },
    status: {
      quiet: "조용히 곁에 있음",
      pocket: "방금 남긴 메모에서 이어지는 중",
      deep: "조금 더 깊게 듣는 중",
      dailyCare: "오늘을 같이 접는 중",
      sleep: "쉬는 중",
    },
    nudge: {
      close: "메모 닫기",
      ignore: "지금은 괜찮아",
    },
    chat: {
      close: "대화 닫기",
      send: "보내기",
      waiting: "한마디만 남겨도 괜찮아.",
      placeholder: "한마디만 남겨도 괜찮아",
      placeholderDeep: "계속 말해도 괜찮아",
      dailyCareLink: "오늘 같이 접어볼까?",
    },
    dailyCare: {
      subtitle: "오늘의 작은 기록",
      title: "오늘 꽤 힘냈어.",
      close: "Daily Care 닫기",
      intro: "네가 노력한 거 같이 확인해볼까?",
      togetherTime: "함께 있었던 시간",
      togetherTimeValue: "2시간 40분",
      noteCount: "아마가 남긴 메모",
      noteCountValue: "3개",
      keywords: "오늘의 감정 키워드",
      keywordValue: "버팀 · 막힘 · 다시 시작",
      closing: "아마의 짧은 메모",
      closingMessage:
        "끝까지 매끈하지 않아도 괜찮아. 오늘은 다시 시작한 것만으로도 충분히 남아.",
    },
    dev: {
      persona: "페르소나",
      timeline: "Local Timeline",
      timelineEmpty: "아직 기록 없음",
    },
  },
  persona: {
    warm_friend: {
      name: "아마",
      shortLabel: "다정한 친구형",
      description: "현실적인 말투로 부담을 낮추고 짧게 곁을 챙긴다.",
    },
    fantasy_guardian: {
      name: "아마데우스",
      shortLabel: "판타지 수호자형",
      description: "과하지 않은 수호자 톤으로 지친 상태를 보호하듯 말한다.",
    },
  },
};
