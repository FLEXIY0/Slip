import * as React from "react";
import { Terminal, ChevronRight, Copy, Check } from "lucide-react";
import type { LogLine } from "@/engine/types";
import { cn } from "@/lib/utils";

interface LogsPanelProps {
  logs: LogLine[];
  defaultOpen?: boolean;
}

const levelColor: Record<LogLine["level"], string> = {
  info: "text-fg-muted",
  warn: "text-fg",
  error: "text-danger",
  cmd: "text-fg",
};

export function LogsPanel({ logs, defaultOpen = false }: LogsPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [copied, setCopied] = React.useState(false);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs, open]);

  const copy = async () => {
    await navigator.clipboard.writeText(
      logs.map((l) => l.text).join("\n"),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-150",
              open && "rotate-90",
            )}
          />
          <Terminal className="size-3.5" />
          Logs
          <span className="rounded-full bg-bg-inset px-1.5 py-0.5 text-2xs tabular-nums text-fg-subtle">
            {logs.length}
          </span>
        </button>
        {open && logs.length > 0 && (
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-2xs text-fg-subtle transition-colors hover:text-fg"
          >
            {copied ? (
              <Check className="size-3 text-success" />
            ) : (
              <Copy className="size-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {open && (
        <div className="max-h-56 overflow-auto border-t border-border bg-bg-subtle px-3.5 py-2.5 font-mono text-2xs leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-fg-subtle">No output yet.</p>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex gap-2 whitespace-pre-wrap break-all">
                <span className="shrink-0 select-none text-fg-subtle">
                  {l.level === "cmd" ? "$" : "›"}
                </span>
                <span className={levelColor[l.level]}>{l.text}</span>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
