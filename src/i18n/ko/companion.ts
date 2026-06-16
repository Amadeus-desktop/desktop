import type { CompanionMessages } from "../modules/companion";

export const companion: CompanionMessages = {
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
    open: "열어서 듣기",
  },
  chat: {
    close: "대화 닫기",
    send: "보내기",
    waiting: "한마디만 남겨도 괜찮아.",
    placeholder: "한마디만 남겨도 괜찮아",
    placeholderDeep: "계속 말해도 괜찮아",
    dailyCareLink: "오늘 같이 접어볼까?",
    you: "나",
    typing: "입력 중",
  },
  dailyCare: {
    subtitle: "오늘의 작은 기록",
    title: "오늘 꽤 힘냈어.",
    close: "Daily Care 닫기",
    intro: "네가 노력한 거 같이 확인해볼까?",
    togetherTime: "함께 있었던 시간",
    noteCount: "아마가 남긴 메모",
    keywords: "오늘의 감정 키워드",
    closing: "아마의 짧은 메모",
  },
  dev: {
    mate: "메이트",
    timeline: "Local Timeline",
    timelineEmpty: "아직 기록 없음",
  },
};
