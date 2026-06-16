import type { ReportMessages } from "../modules/report";

export const report: ReportMessages = {
  eyebrow: "Daily Care",
  title: "오늘 돌아보기",
  description: "오늘 버틴 시간과 다시 돌아온 순간을 함께 확인해요.",
  intro: {
    prompt: "오늘 꽤 힘냈어. 네가 노력한 거 같이 확인해볼까?",
  },
  summaryOverlay: {
    preface: "오늘도 힘냈어.",
    title: "오늘 뭐 했는지\n천천히 확인해볼까?",
    description: "평가표처럼 쪼개지 않고, 오늘 남은 흐름만 조용히 묶어봤어.",
    close: "하루 총산 닫기",
    defaultName: "너",
    navigation: {
      next: "다음",
      back: "이전",
      finish: "오늘 마무리하기",
    },
    stepLabels: {
      welcome: "인사",
      summary: "같이 본 흐름",
      mood: "감정 키워드",
      moments: "남은 흔적",
      closing: "마무리",
    },
    steps: {
      welcome: {
        eyebrow: "Daily Care",
        title: "오늘 뭐 했는지\n같이 확인해볼까?",
        description: "숫자 말고, 내가 곁에서 본 흐름부터 묶어볼게.",
        cta: "볼까?",
      },
      narrative: {
        eyebrow: "곁에서 본 오늘",
        title: "오늘 남은 흐름",
      },
      activity: {
        eyebrow: "오늘의 흔적",
        longStay: "오래 머문 흐름",
        trace: "짧게 남은 흔적",
        kinds: {
          work: "작업",
          break: "쉬어감",
          unknown: "머문 곳",
        },
      },
      keywords: {
        eyebrow: "오늘의 감정",
        title: "오늘은 이런 날이었어",
        description: "키워드만 가볍게 남겨뒀어.",
      },
      closing: {
        eyebrow: "마무리",
        title: "companion의 한마디",
      },
    },
  },
  sections: {
    summary: "오늘 함께한 시간",
    moments: "오늘의 순간들",
    closing: "마무리 한마디",
  },
  metrics: {
    togetherTime: "함께 있었던 시간",
    nudges: "오늘의 NudgeNote",
    chatOpens: "채팅으로 이어진 횟수",
    returns: "다시 돌아온 순간",
  },
  emotionalKeywords: {
    title: "오늘의 감정 키워드",
    fallback: "오늘은 조용히 버틴 하루",
    tags: {
      steady: "차분함",
      tired: "지침",
      focused: "집중",
      gentle: "은은함",
      return: "다시 돌아옴",
    },
  },
  closingNote: {
    title: "companion의 한마디",
    quiet:
      "오늘은 조용히 버틴 하루였네. 그래도 혼자가 아니었어 — 내가 곁에 있었거든.",
    gentle:
      "오늘도 잘 버텼어. 힘든 순간마다 다시 돌아온 것만으로도 충분히 대단해.",
    active:
      "오늘은 꽤 바쁜 하루였네. 그래도 중간중간 나랑 이야기해줘서 고마워.",
  },
  timeline: {
    loading: "오늘의 순간을 불러오는 중이에요.",
    empty: "아직 함께한 기록이 없어요.",
    refresh: "새로고침",
    expand: "더 보기 ({count}개)",
    collapse: "접기",
  },
  format: {
    hoursMinutes: "{hours}시간 {minutes}분",
    hoursOnly: "{hours}시간",
    minutesOnly: "{minutes}분",
    zeroDuration: "아직 기록 없음",
    count: "{count}번",
    zeroCount: "없음",
  },
};
