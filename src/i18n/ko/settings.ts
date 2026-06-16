import type { SettingsMessages } from "../modules/settings";

export const settings: SettingsMessages = {
  eyebrow: "Preferences",
  title: "일반 설정",
  description: "말투, 호칭, 말 걸기 빈도처럼 companion과의 일상을 정해요.",
  sections: {
    conversation: "함께하기",
    model: "모델 · 연결",
    language: "언어",
  },
  advanced: {
    toggle: "고급 설정",
    hint: "로컬 모델, LLM 라우팅, 테스트 발화",
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
      test: "테스트용으로 바로 반응",
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
  modelPreset: {
    label: "추천 로컬 모델",
    subtitle: "8GB RAM 노트북 기준 기본 추천",
    recommended: "Qwen2.5-3B-Instruct GGUF (Q4_K_M, ~2GB)",
  },
  llmHealth: {
    label: "LLM provider 상태",
    checking: "확인 중",
    available: "사용 가능",
    unavailable: "사용 불가",
  },
  testUtterance: {
    label: "테스트 발화",
    subtitle: "현재 라우트로 짧은 companion 발화를 생성합니다.",
    button: "테스트 실행",
    running: "생성 중…",
  },
  appearance: {
    label: "테마",
    subtitle: "앱 밝기 — 다크, 라이트, 시스템 설정 따름",
    options: {
      dark: "다크",
      light: "라이트",
      system: "시스템",
    },
  },
  accentColor: {
    label: "강조 색상",
    subtitle: "버튼, 토글, 포인트 컬러",
    options: {
      rose: "로즈",
      lavender: "라벤더",
      sky: "스카이",
      mint: "민트",
      peach: "피치",
    },
  },
  companionPersona: {
    label: "companion 페르소나",
    subtitle: "말투와 관계 설정",
    icons: {
      bubble: "말풍선",
      letter: "편지",
      star: "별",
      orb: "오브",
    },
  },
  mateIcon: {
    label: "메이트",
    subtitle: "우측 하단에 표시할 아이콘 — 외곽선은 강조 색상을 따릅니다",
    icons: {
      bubble: "대화",
      letter: "편지",
      star: "별",
      orb: "원형",
    },
  },
};
