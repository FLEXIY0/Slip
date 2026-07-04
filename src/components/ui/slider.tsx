import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  "aria-label"?: string;
}

/** Native range input styled to the Slip system (no external dep). */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  ...aria
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn("relative flex h-5 w-full items-center", className)}>
      <div className="absolute h-1.5 w-full rounded-full bg-bg-inset" />
      <div
        className="absolute h-1.5 rounded-full bg-accent"
        style={{ width: `${pct}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slip-range absolute h-5 w-full cursor-pointer appearance-none bg-transparent"
        {...aria}
      />
      <style>{`
        .slip-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px; width: 16px; border-radius: 9999px;
          background: hsl(var(--bg-elevated));
          border: 1.5px solid hsl(var(--accent));
          box-shadow: 0 1px 3px hsl(var(--shadow) / 0.18);
          transition: transform .12s ease;
        }
        .slip-range::-webkit-slider-thumb:hover { transform: scale(1.12); }
        .slip-range::-moz-range-thumb {
          height: 16px; width: 16px; border-radius: 9999px;
          background: hsl(var(--bg-elevated));
          border: 1.5px solid hsl(var(--accent));
        }
      `}</style>
    </div>
  );
}
