import type { CSSProperties } from "react";
import { cn } from "../../../lib/utils/cn";
import { getPersonaAccent } from "../../../domain/persona/theme";
import type { PersonaId, PresenceIconKind } from "../../../domain/persona/types";
import { PRESENCE_ICON_BY_PERSONA } from "../../../domain/persona/types";
import {
  PRESENCE_GLYPH_ICON,
  PRESENCE_ICON_TILE,
  type PresenceIconSize,
} from "../../../ui/tokens/avatarSizes";

type PersonaPresenceIconProps = {
  personaId?: PersonaId;
  kind?: PresenceIconKind;
  size?: PresenceIconSize;
  shape?: "circle" | "square";
  variant?: "filled" | "outline";
  showFill?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function PersonaPresenceIcon({
  personaId,
  kind,
  size = "sm",
  shape = "circle",
  variant = "filled",
  showFill = true,
  className,
  style,
}: PersonaPresenceIconProps) {
  const resolvedKind =
    kind ?? (personaId ? PRESENCE_ICON_BY_PERSONA[personaId] : "bubble");
  const accent = personaId ? getPersonaAccent(personaId) : null;
  const isOutline = variant === "outline";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden text-white",
        shape === "square" ? "rounded-[12px]" : "rounded-full",
        size !== "fab" && PRESENCE_ICON_TILE[size],
        isOutline
          ? "border-2 bg-transparent shadow-none"
          : "border border-[#48484f] bg-[#2c2c30] shadow-none",
        !isOutline && accent?.ring,
        className,
      )}
      style={{
        ...(isOutline && accent ? { borderColor: `rgb(${accent.glow})` } : undefined),
        ...style,
      }}
      aria-hidden="true"
    >
      {accent && showFill && !isOutline ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 bg-gradient-to-br",
            accent.gradient,
          )}
        />
      ) : null}
      <span className="relative z-10 flex items-center justify-center">
        <PresenceGlyph kind={resolvedKind} className={PRESENCE_GLYPH_ICON[size]} />
      </span>
    </span>
  );
}

function PresenceGlyph({
  kind,
  className,
}: {
  kind: PresenceIconKind;
  className: string;
}) {
  switch (kind) {
    case "bubble":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M7 18.5 8.5 15H17a4 4 0 0 0 0-8H9a4 4 0 0 0-4 4v5.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "letter":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M5 8.5 12 12.5 19 8.5M6 17h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M12 4.5 13.6 9l4.7.3-3.6 2.8 1.3 4.6L12 14.8 7 16.7l1.3-4.6-3.6-2.8 4.7-.3L12 4.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M18.5 5.5v2M19.5 6.5h-2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "orb":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity="0.35" />
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8.5 12h7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case "face":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="9.5" cy="11" r="0.9" fill="currentColor" />
          <circle cx="14.5" cy="11" r="0.9" fill="currentColor" />
          <path
            d="M9.5 14.2c.9.8 2.1 1.2 2.5 1.2s1.6-.4 2.5-1.2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className}>
          <path
            d="M15.5 6.5C11 6 7.5 8.8 6.5 13c3.2-.4 6.1-2.2 7.8-5.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 16.5c1.2-2.4 3.2-4.1 6-5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M11.5 18.5c.4-1.2.4-2.2 0-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
