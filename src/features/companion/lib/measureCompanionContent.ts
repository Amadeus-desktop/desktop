import type { CompanionContentRect } from "./companionLayoutTargets";

/** Measures the companion stack including overflow that `getBoundingClientRect` can miss. */
export function measureCompanionContentRect(
  element: HTMLElement,
): CompanionContentRect {
  const rect = element.getBoundingClientRect();

  return {
    width: Math.max(
      1,
      Math.ceil(Math.max(rect.width, element.scrollWidth, element.offsetWidth)),
    ),
    height: Math.max(
      1,
      Math.ceil(Math.max(rect.height, element.scrollHeight, element.offsetHeight)),
    ),
  };
}
