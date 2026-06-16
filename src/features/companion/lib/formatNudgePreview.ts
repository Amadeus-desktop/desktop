/** Short preview for the nudge note bubble (about 1–2 sentences). */
export function formatNudgePreview(text: string, maxSentences = 2): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const sentences = trimmed.match(/[^.!?。！？\n]+(?:[.!?。！？]|$)/g);
  if (!sentences?.length) {
    return trimmed;
  }

  const preview = sentences.slice(0, maxSentences).join("").trim();
  return preview || trimmed;
}
