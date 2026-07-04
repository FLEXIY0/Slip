import { cn } from "@/lib/utils";
import { qualityLabel } from "@/engine/bitrate";

interface QualityIndicatorProps {
  score: number; // 0..100
  className?: string;
}

/** A calm, monochrome quality meter. Only the label carries tone. */
export function QualityIndicator({ score, className }: QualityIndicatorProps) {
  const { label, tone } = qualityLabel(score);
  const bars = 5;
  const filled = Math.round((score / 100) * bars);

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-end gap-1" aria-hidden>
        {Array.from({ length: bars }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-300",
              i < filled ? "bg-fg" : "bg-bg-inset",
            )}
            style={{ height: `${8 + i * 3}px` }}
          />
        ))}
      </div>
      <span
        className={cn(
          "text-[13px] font-medium tabular-nums",
          tone === "good" && "text-fg",
          tone === "ok" && "text-fg-muted",
          tone === "low" && "text-fg-subtle",
        )}
      >
        {label}
      </span>
    </div>
  );
}
