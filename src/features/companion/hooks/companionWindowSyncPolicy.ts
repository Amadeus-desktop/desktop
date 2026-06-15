export type CompanionWindowSize = {
  width: number;
  height: number;
};

export type CompanionContentRect = {
  width: number;
  height: number;
};

export function computeCompanionWindowSize(
  rect: CompanionContentRect,
  inset: number,
): CompanionWindowSize {
  return {
    width: Math.max(1, Math.ceil(rect.width) + inset * 2),
    height: Math.max(1, Math.ceil(rect.height) + inset * 2),
  };
}

export function shouldSkipCompanionResize(
  lastAppliedSize: CompanionWindowSize | null,
  nextSize: CompanionWindowSize,
) {
  return (
    lastAppliedSize?.width === nextSize.width &&
    lastAppliedSize.height === nextSize.height
  );
}
