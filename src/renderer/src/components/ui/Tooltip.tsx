import type { ReactNode } from "react";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  side?: TooltipSide;
  children: ReactNode;
}

const SIDE_POSITIONS: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-1.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-1.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-1.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-1.5 -translate-y-1/2",
};

export function Tooltip({ label, side = "top", children }: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-sm text-text-primary shadow-lg",
          "opacity-0 transition-opacity duration-100",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          SIDE_POSITIONS[side],
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
