import { cn } from "@/lib/utils";

/**
 * Slip mark — a play glyph slipping *through* a narrow slot (the upload limit).
 * Monochrome, currentColor, works at any size. Rounded, calm, engineered.
 */
export function SlipMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("text-fg", className)}
      aria-hidden
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="8"
        className="fill-fg"
      />
      {/* The slot */}
      <rect x="7" y="14.6" width="18" height="2.8" rx="1.4" className="fill-bg" />
      {/* Play glyph slipping through */}
      <path
        d="M13 6.2 L20.4 11 A1 1 0 0 1 20.4 12.6 L13 13.2 Z"
        className="fill-bg"
      />
      <path
        d="M13 18.8 L20.4 19.4 A1 1 0 0 1 20.4 21 L13 25.8 Z"
        className="fill-bg"
        opacity="0.55"
      />
    </svg>
  );
}
