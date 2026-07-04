import * as React from "react";
import { Clock, HardDriveDownload, Layers, Trash2 } from "lucide-react";
import { HistoryCard } from "@/components/HistoryCard";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useApp } from "@/lib/store";
import { formatBytes } from "@/lib/utils";

export function History() {
  const history = useApp((s) => s.history);
  const removeHistory = useApp((s) => s.removeHistory);
  const clearHistory = useApp((s) => s.clearHistory);
  const [confirmClear, setConfirmClear] = React.useState(false);

  const stats = React.useMemo(() => {
    const savedBytes = history.reduce(
      (acc, h) => acc + Math.max(0, h.inputBytes - h.outputBytes),
      0,
    );
    return {
      count: history.length,
      savedBytes,
      underLimit: history.filter((h) => h.underLimit).length,
    };
  }, [history]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
            History
          </h1>
          <p className="text-[15px] text-fg-muted">
            Every video you've slipped through.
          </p>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmClear(true)}
            className="text-fg-muted hover:text-danger"
          >
            <Trash2 className="size-3.5" />
            Clear
          </Button>
        )}
      </header>

      {history.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-3 gap-3">
            <Stat
              icon={<Layers className="size-4" />}
              value={String(stats.count)}
              label="Compressed"
            />
            <Stat
              icon={<HardDriveDownload className="size-4" />}
              value={formatBytes(stats.savedBytes)}
              label="Total saved"
            />
            <Stat
              icon={<Clock className="size-4" />}
              value={`${stats.underLimit}/${stats.count}`}
              label="Under limit"
            />
          </div>

          <Heatmap history={history} />

          <div className="mt-8 flex flex-col gap-2.5">
            {history.map((entry) => (
              <HistoryCard key={entry.id} entry={entry} onRemove={removeHistory} />
            ))}
          </div>
        </>
      )}

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear history?"
        description="This removes all local history entries. Your files aren't affected."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearHistory();
                setConfirmClear(false);
              }}
            >
              Clear all
            </Button>
          </>
        }
      />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <div className="mb-2 text-fg-subtle">{icon}</div>
      <div className="text-xl font-semibold tracking-tight tabular-nums text-fg">
        {value}
      </div>
      <div className="mt-0.5 text-2xs text-fg-muted">{label}</div>
    </div>
  );
}

/** GitHub-style contribution grid, driven by daily compression counts. */
function Heatmap({ history }: { history: { createdAt: number }[] }) {
  const { weeks, max } = React.useMemo(() => {
    const days = 7 * 18; // ~18 weeks
    const counts = new Map<string, number>();
    for (const h of history) {
      const key = dayKey(h.createdAt);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells: { key: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = dayKey(d.getTime());
      cells.push({ key, count: counts.get(key) ?? 0 });
    }
    const weeksArr: { key: string; count: number }[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeksArr.push(cells.slice(i, i + 7));
    }
    const maxCount = Math.max(1, ...cells.map((c) => c.count));
    return { weeks: weeksArr, max: maxCount };
  }, [history]);

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">Activity</span>
        <div className="flex items-center gap-1.5 text-2xs text-fg-subtle">
          Less
          {[0, 0.25, 0.5, 0.75, 1].map((l) => (
            <span
              key={l}
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: shade(l) }}
            />
          ))}
          More
        </div>
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <div
                key={cell.key}
                title={`${cell.count} on ${cell.key}`}
                className="size-2.5 rounded-[3px] transition-colors"
                style={{ backgroundColor: shade(cell.count / max) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Monochrome heat shade using the foreground colour at varying alpha. */
function shade(level: number): string {
  if (level <= 0) return "hsl(var(--bg-inset))";
  const alpha = 0.2 + level * 0.8;
  return `hsl(var(--fg) / ${alpha.toFixed(2)})`;
}

function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-bg-subtle px-6 py-20 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl border border-border bg-bg-elevated text-fg-subtle">
        <Clock className="size-5" />
      </div>
      <p className="text-[15px] font-medium text-fg">No history yet</p>
      <p className="mt-1 max-w-xs text-[13px] text-fg-muted">
        Compressed videos will appear here as a clean, browsable timeline.
      </p>
    </div>
  );
}
