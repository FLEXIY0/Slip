import * as React from "react";
import { Sliders } from "lucide-react";
import { SIZE_PRESETS } from "@/engine/bitrate";
import { cn, formatBytes } from "@/lib/utils";
import { Slider } from "./ui/slider";

interface TargetSizeSelectorProps {
  value: number; // bytes
  onChange: (bytes: number) => void;
}

const MB = 1024 * 1024;

export function TargetSizeSelector({ value, onChange }: TargetSizeSelectorProps) {
  const isPreset = SIZE_PRESETS.some((p) => p.bytes === value);
  const [custom, setCustom] = React.useState(!isPreset);
  const mb = Math.round(value / MB);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SIZE_PRESETS.map((preset) => {
          const active = !custom && value === preset.bytes;
          return (
            <button
              key={preset.label}
              onClick={() => {
                setCustom(false);
                onChange(preset.bytes);
              }}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                active
                  ? "border-accent bg-bg-inset shadow-xs"
                  : "border-border bg-bg-elevated hover:border-border-strong hover:bg-bg-subtle",
              )}
            >
              <span className="text-sm font-semibold text-fg tabular-nums">
                {preset.label}
              </span>
              <span className="text-2xs text-fg-subtle">{preset.hint}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setCustom(true)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-colors",
          custom
            ? "border-accent bg-bg-inset"
            : "border-border bg-bg-elevated hover:border-border-strong",
        )}
      >
        <Sliders className="size-3.5 text-fg-subtle" />
        <span className="font-medium text-fg">Custom</span>
        {custom && (
          <span className="ml-auto text-2xs tabular-nums text-fg-muted">
            {formatBytes(value)}
          </span>
        )}
      </button>

      {custom && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-bg-subtle px-3.5 py-3 animate-fade-in">
          <Slider
            value={mb}
            min={1}
            max={500}
            step={1}
            onChange={(v) => onChange(v * MB)}
            aria-label="Target size in megabytes"
          />
          <div className="flex shrink-0 items-baseline gap-1">
            <input
              type="number"
              min={1}
              max={500}
              value={mb}
              onChange={(e) =>
                onChange(Math.max(1, Number(e.target.value || 1)) * MB)
              }
              className="w-14 rounded-md border border-border bg-bg-elevated px-2 py-1 text-right text-sm font-semibold tabular-nums text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
            <span className="text-2xs font-medium text-fg-muted">MB</span>
          </div>
        </div>
      )}
    </div>
  );
}
