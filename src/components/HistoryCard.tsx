import { ArrowRight, Check, Film, Trash2 } from "lucide-react";
import type { HistoryEntry } from "@/lib/store";
import {
  cn,
  formatBytes,
  formatDuration,
  formatRelativeTime,
  percentSaved,
} from "@/lib/utils";
import { Badge } from "./ui/badge";

interface HistoryCardProps {
  entry: HistoryEntry;
  onRemove: (id: string) => void;
}

export function HistoryCard({ entry, onRemove }: HistoryCardProps) {
  const saved = percentSaved(entry.inputBytes, entry.outputBytes);
  return (
    <div className="group relative flex items-center gap-4 rounded-xl border border-border bg-bg-elevated p-3.5 transition-colors hover:border-border-strong">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-subtle text-fg-muted">
        <Film className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium text-fg" title={entry.name}>
            {entry.name}
          </p>
          {entry.underLimit && (
            <Badge variant="success" className="shrink-0">
              <Check className="size-3" />
              Under limit
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs text-fg-muted tabular-nums">
          <span>{formatBytes(entry.inputBytes)}</span>
          <ArrowRight className="size-3 text-fg-subtle" />
          <span className="font-medium text-fg">{formatBytes(entry.outputBytes)}</span>
          <span className="text-fg-subtle">·</span>
          <span>{entry.width}×{entry.height}</span>
          <span className="text-fg-subtle">·</span>
          <span>{formatDuration(entry.durationSec)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            saved > 0 ? "text-fg" : "text-fg-subtle",
          )}
        >
          −{saved}%
        </span>
        <span className="text-2xs text-fg-subtle">
          {formatRelativeTime(entry.createdAt)}
        </span>
      </div>

      <button
        onClick={() => onRemove(entry.id)}
        className="absolute right-2.5 top-2.5 text-fg-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
        aria-label="Remove from history"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
