import * as React from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FolderSearch,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  FFMPEG_DOWNLOAD,
  FFMPEG_INSTALL_HINT,
  openExternal,
  platform,
} from "@/lib/native";

interface FfmpegSetupProps {
  error: string | null;
  checking: boolean;
  onLocate: () => void;
  onRetry: () => void;
}

/**
 * Shown on native when FFmpeg can't be found. Turns a dead-end error into a
 * one-click path forward: install, locate the binary, or retry.
 */
export function FfmpegSetup({
  error,
  checking,
  onLocate,
  onRetry,
}: FfmpegSetupProps) {
  const os = platform();
  const hint = FFMPEG_INSTALL_HINT[os];
  const [copied, setCopied] = React.useState(false);

  const copyHint = async () => {
    await navigator.clipboard.writeText(hint);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="rounded-2xl border border-border bg-bg-subtle p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-muted">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-fg">
            FFmpeg is required to compress
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-fg-muted">
            Slip uses FFmpeg for native, full-quality encoding. It isn't on this
            machine yet — install it, or point Slip at an existing binary.
          </p>

          {hint && (
            <div className="mt-4">
              <p className="mb-1.5 text-2xs font-medium uppercase tracking-wide text-fg-subtle">
                Quickest way
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2 font-mono text-[13px] text-fg">
                <span className="truncate">{hint}</span>
                <button
                  onClick={copyHint}
                  className="flex shrink-0 items-center gap-1.5 text-2xs text-fg-subtle transition-colors hover:text-fg"
                >
                  {copied ? (
                    <Check className="size-3 text-success" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1.5 text-2xs text-fg-subtle">
                After installing, reopen Slip or press Retry.
              </p>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => openExternal(FFMPEG_DOWNLOAD[os])}>
              <Download />
              Download FFmpeg
            </Button>
            <Button variant="outline" onClick={onLocate}>
              <FolderSearch />
              Locate ffmpeg…
            </Button>
            <Button variant="ghost" onClick={onRetry} disabled={checking}>
              {checking ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Retry
            </Button>
          </div>

          {error && (
            <p className="mt-4 truncate rounded-md bg-bg-inset px-2.5 py-1.5 font-mono text-2xs text-fg-subtle">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
