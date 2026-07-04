import { cn } from "@/lib/utils";

interface ProgressProps {
  /** 0..1 */
  value: number;
  className?: string;
  indeterminate?: boolean;
  tone?: "default" | "success" | "danger";
}

export function Progress({
  value,
  className,
  indeterminate,
  tone = "default",
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const barColor =
    tone === "success"
      ? "bg-success"
      : tone === "danger"
        ? "bg-danger"
        : "bg-accent";
  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-bg-inset",
        className,
      )}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : Math.round(pct)}
    >
      {indeterminate ? (
        <div
          className={cn(
            "absolute inset-y-0 w-1/3 rounded-full",
            barColor,
            "animate-[shimmer_1.4s_ease-in-out_infinite]",
          )}
          style={{ left: "-33%" }}
        />
      ) : (
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-smooth",
            barColor,
          )}
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}
