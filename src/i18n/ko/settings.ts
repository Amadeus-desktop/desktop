import type { SettingsMessages } from "../modules/settings";

export const settings: SettingsMessages = {
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
  companionPersona: {
    label: "companion 페르소나",
    subtitle: "말투와 하단 presence 아이콘 스타일을 고릅니다.",
    icons: {
      bubble: "말풍선 아이콘",
      letter: "편지/메모 아이콘",
      star: "별/반짝임 아이콘",
      orb: "오브/라운드 아이콘",
      line: "심플 라인 아이콘",
      face: "작은 얼굴/감정 아이콘",
      leaf: "잎/물방울 아이콘",
    },
  },
};
