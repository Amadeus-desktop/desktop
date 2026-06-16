import { useEffect, useRef } from "react";

export function useChatAutoScroll(scrollKey: number) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let innerFrame = 0;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        element.scrollTop = element.scrollHeight;
      });
    });

    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame !== 0) {
        cancelAnimationFrame(innerFrame);
      }
    };
  }, [scrollKey]);

  return ref;
}
