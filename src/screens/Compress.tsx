import {
  ArrowRight,
  Download,
  Loader2,
  Share2,
  Sparkles,
  X,
  RotateCcw,
} from "lucide-react";
import { UploadZone } from "@/components/UploadZone";
import { FfmpegSetup } from "@/components/FfmpegSetup";
import { VideoPreview } from "@/components/VideoPreview";
import { TargetSizeSelector } from "@/components/TargetSizeSelector";
import { QualityIndicator } from "@/components/QualityIndicator";
import { LogsPanel } from "@/components/LogsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dropdown } from "@/components/ui/dropdown";
import type { QualityMode, ResolutionCap } from "@/engine/types";
import { cn, formatBytes, percentSaved } from "@/lib/utils";
import type { useCompressor } from "@/hooks/useCompressor";

const QUALITY_OPTS: { value: QualityMode; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "Best balance for the target" },
  { value: "quality", label: "Prefer quality", hint: "Higher bitrate ceiling" },
  { value: "balanced", label: "Balanced", hint: "Reliable size fit" },
  { value: "small", label: "Prefer small", hint: "Extra safety margin" },
];

const RES_OPTS: { value: ResolutionCap; label: string; hint: string }[] = [
  { value: "source", label: "Original", hint: "Keep source resolution" },
  { value: "1080p", label: "1080p", hint: "Cap at 1920×1080" },
  { value: "720p", label: "720p", hint: "Cap at 1280×720" },
  { value: "480p", label: "480p", hint: "Cap at 854×480" },
];

const STAGE_LABEL: Record<string, string> = {
  preparing: "Preparing",
  probing: "Reading video",
  pass1: "Analyzing (pass 1)",
  pass2: "Encoding (pass 2)",
  encoding: "Encoding",
  finalizing: "Finalizing",
  done: "Done",
};

type C = ReturnType<typeof useCompressor>;

export function Compress(c: C) {
  const working = c.phase === "working";
  const hasFile = !!c.source;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          Compress
        </h1>
        <p className="text-[15px] text-fg-muted">
          Slip videos through impossible upload limits.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* Left: source */}
        <div className="flex flex-col gap-4">
          {!c.engineReady && !hasFile ? (
            <FfmpegSetup
              error={c.engineError}
              checking={c.checkingEngine}
              onLocate={c.locateFfmpeg}
              onRetry={c.checkEngine}
            />
          ) : !hasFile ? (
            <UploadZone onSelect={c.setSource} disabled={working} />
          ) : (
            <VideoPreview input={c.source!} info={c.info} onRemove={c.clear} />
          )}

          {hasFile && (c.logs.length > 0 || working) && (
            <LogsPanel logs={c.logs} defaultOpen={working} />
          )}
        </div>

        {/* Right: controls */}
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <SectionLabel step="1" title="Target size" />
            <TargetSizeSelector value={c.targetBytes} onChange={c.setTargetBytes} />
          </section>

          <section className="flex flex-col gap-3">
            <SectionLabel step="2" title="Quality & resolution" />
            <div className="grid grid-cols-2 gap-2">
              <Dropdown
                value={c.quality}
                options={QUALITY_OPTS}
                onChange={c.setQuality}
                disabled={working}
              />
              <Dropdown
                value={c.resolution}
                options={RES_OPTS}
                onChange={c.setResolution}
                disabled={working}
              />
            </div>
          </section>

          {/* Estimate card */}
          <EstimateCard c={c} />

          {/* Action */}
          <ActionBar c={c} working={working} />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ step, title }: { step: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-5 items-center justify-center rounded-full border border-border text-2xs font-semibold text-fg-muted tabular-nums">
        {step}
      </span>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-fg-muted">
        {title}
      </h2>
    </div>
  );
}

function EstimateCard({ c }: { c: C }) {
  const { plan, info, targetBytes, qualityScore, result, source } = c;
  const est = result ? result.bytes : plan?.estimatedBytes ?? 0;
  const under = est > 0 && est <= targetBytes;
  const empty = !info;
  const inputBytes = source ? source.size || info?.sizeBytes || 0 : 0;

  return (
    <div className="rounded-xl border border-border bg-bg-subtle p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-fg-muted">
          Estimated output
        </span>
        {!empty &&
          (under ? (
            <Badge variant="success">Fits target</Badge>
          ) : est > 0 ? (
            <Badge variant="outline">Tight — adjust</Badge>
          ) : null)}
      </div>

      <div className="mt-2 flex items-baseline gap-2.5">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums",
            empty && "text-fg-subtle",
          )}
        >
          {empty ? "—" : formatBytes(est)}
        </span>
        {inputBytes > 0 && info && (
          <span className="flex items-center gap-1.5 text-[13px] text-fg-subtle">
            <span className="line-through">{formatBytes(inputBytes)}</span>
            {est > 0 && (
              <span className="font-medium text-fg-muted">
                −{percentSaved(inputBytes, est)}%
              </span>
            )}
          </span>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-3.5">
        {empty ? (
          <div className="flex items-center justify-between text-[13px] text-fg-subtle">
            <span>Predicted quality</span>
            <span>Add a video</span>
          </div>
        ) : (
          <QualityIndicator score={qualityScore} />
        )}
      </div>
    </div>
  );
}

function ActionBar({ c, working }: { c: C; working: boolean }) {
  const { phase, progress, result, targetBytes } = c;

  if (working) {
    const pct = Math.round(progress.ratio * 100);
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[13px] font-medium text-fg">
            <Loader2 className="size-3.5 animate-spin text-fg-muted" />
            {STAGE_LABEL[progress.stage] ?? "Working"}
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-fg">
            {pct}%
          </span>
        </div>
        <Progress value={progress.ratio} indeterminate={progress.ratio === 0} />
        <div className="flex items-center justify-between text-2xs text-fg-subtle tabular-nums">
          <span>
            {progress.speed ? `${progress.speed.toFixed(1)}× speed` : "Encoding…"}
          </span>
          <button
            onClick={c.cancel}
            className="inline-flex items-center gap-1 font-medium text-fg-muted transition-colors hover:text-danger"
          >
            <X className="size-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done" && result) {
    const under = result.bytes <= targetBytes;
    return (
      <div className="flex flex-col gap-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3.5",
            under
              ? "border-success/30 bg-success/[0.06]"
              : "border-border bg-bg-subtle",
          )}
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              under ? "bg-success/15 text-success" : "bg-bg-inset text-fg-muted",
            )}
          >
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-fg">
              {formatBytes(result.bytes)}{" "}
              <span className="text-fg-subtle">
                · {under ? "under your limit" : "close to target"}
              </span>
            </p>
            <p className="text-2xs text-fg-subtle">
              {(result.durationMs / 1000).toFixed(1)}s to encode
            </p>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <Button variant="primary" size="lg" onClick={c.download}>
            <Download />
            Download
          </Button>
          <Button variant="secondary" size="lg" onClick={c.share} aria-label="Share">
            <Share2 />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={c.clear}
            aria-label="Start over"
          >
            <RotateCcw />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="primary"
      size="lg"
      disabled={!c.source || !c.info || !c.engineReady}
      onClick={c.start}
      className="w-full"
    >
      Compress
      <ArrowRight />
    </Button>
  );
}
