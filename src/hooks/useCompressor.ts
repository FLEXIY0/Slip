import * as React from "react";
import {
  getEngine,
  isNative,
  planEncode,
  estimateQualityScore,
  type CompressResult,
  type LogLine,
  type Progress,
  type QualityMode,
  type ResolutionCap,
  type VideoInfo,
} from "@/engine";
import { useApp } from "@/lib/store";
import { toast } from "@/components/ui/toast";
import { percentSaved } from "@/lib/utils";
import { nativeSetFfmpegPath, pickFfmpegFile } from "@/lib/native";

export type Phase = "empty" | "ready" | "working" | "done" | "error";

const MAX_LOGS = 400;

export function useCompressor() {
  const settings = useApp((s) => s.settings);
  const addHistory = useApp((s) => s.addHistory);

  const [file, setFileState] = React.useState<File | null>(null);
  const [info, setInfo] = React.useState<VideoInfo | null>(null);
  const [phase, setPhase] = React.useState<Phase>("empty");
  const [targetBytes, setTargetBytes] = React.useState(10 * 1024 * 1024);
  const [quality, setQuality] = React.useState<QualityMode>(settings.defaultQuality);
  const [resolution, setResolution] = React.useState<ResolutionCap>(
    settings.defaultResolution,
  );
  const [progress, setProgress] = React.useState<Progress>({
    stage: "idle",
    ratio: 0,
  });
  const [logs, setLogs] = React.useState<LogLine[]>([]);
  const [result, setResult] = React.useState<CompressResult | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Engine readiness — on native this means FFmpeg was resolved.
  const [engineReady, setEngineReady] = React.useState(!isNative());
  const [engineError, setEngineError] = React.useState<string | null>(null);
  const [checkingEngine, setCheckingEngine] = React.useState(false);
  const setSettings = useApp((s) => s.setSettings);
  const ffmpegPath = settings.ffmpegPath;

  const log = React.useCallback((line: LogLine) => {
    setLogs((prev) => [...prev.slice(-MAX_LOGS), line]);
  }, []);

  // Verify the native engine can find FFmpeg (honouring a custom path).
  const checkEngine = React.useCallback(async () => {
    if (!isNative()) {
      setEngineReady(true);
      setEngineError(null);
      return;
    }
    setCheckingEngine(true);
    try {
      const version = ffmpegPath
        ? await nativeSetFfmpegPath(ffmpegPath)
        : await (async () => {
            const engine = getEngine();
            await engine.load(log);
            return "ready";
          })();
      log({ ts: Date.now(), level: "info", text: `FFmpeg · ${version}` });
      setEngineReady(true);
      setEngineError(null);
    } catch (err) {
      setEngineReady(false);
      setEngineError(String(err));
    } finally {
      setCheckingEngine(false);
    }
  }, [ffmpegPath, log]);

  React.useEffect(() => {
    void checkEngine();
  }, [checkEngine]);

  // Let the user point Slip at an ffmpeg binary via the file picker.
  const locateFfmpeg = React.useCallback(async () => {
    try {
      const picked = await pickFfmpegFile();
      if (!picked) return;
      const version = await nativeSetFfmpegPath(picked);
      setSettings({ ffmpegPath: picked });
      setEngineReady(true);
      setEngineError(null);
      toast.success("FFmpeg connected", version);
    } catch (err) {
      toast.error("That file didn't work", String(err));
    }
  }, [setSettings]);

  const setFile = React.useCallback(
    async (f: File) => {
      abortRef.current?.abort();
      setFileState(f);
      setInfo(null);
      setResult(null);
      setLogs([]);
      setProgress({ stage: "probing", ratio: 0 });
      setPhase("ready");
      try {
        const engine = getEngine();
        if (!engine.isReady()) await engine.load(log);
        const probed = await engine.probe(f);
        setInfo(probed);
        setProgress({ stage: "idle", ratio: 0 });
        log({
          ts: Date.now(),
          level: "info",
          text: `Loaded ${f.name} · ${probed.width}×${probed.height} · ${probed.durationSec.toFixed(1)}s`,
        });
      } catch (err) {
        log({ ts: Date.now(), level: "error", text: String(err) });
        toast.error("Couldn't read that video", "Try a different file or format.");
        setPhase("error");
      }
    },
    [log],
  );

  const clear = React.useCallback(() => {
    abortRef.current?.abort();
    setFileState(null);
    setInfo(null);
    setResult(null);
    setLogs([]);
    setProgress({ stage: "idle", ratio: 0 });
    setPhase("empty");
  }, []);

  const plan = React.useMemo(() => {
    if (!info) return null;
    return planEncode({
      targetBytes,
      info,
      resolutionCap: resolution,
      quality,
      hardwareAccel: settings.hardwareAccel,
    });
  }, [info, targetBytes, resolution, quality, settings.hardwareAccel]);

  const qualityScore = React.useMemo(
    () => (plan && info ? estimateQualityScore(plan, info) : 0),
    [plan, info],
  );

  const start = React.useCallback(async () => {
    if (!file || !info) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("working");
    setResult(null);
    setProgress({ stage: "preparing", ratio: 0 });

    try {
      const engine = getEngine();
      if (!engine.isReady()) await engine.load(log);
      const res = await engine.compress(
        file,
        {
          targetBytes,
          info,
          resolutionCap: resolution,
          quality,
          hardwareAccel: settings.hardwareAccel,
        },
        {
          onProgress: setProgress,
          onLog: log,
          signal: controller.signal,
        },
      );
      setResult(res);
      setProgress({ stage: "done", ratio: 1 });
      setPhase("done");

      const underLimit = res.bytes <= targetBytes;
      addHistory({
        name: file.name,
        inputBytes: file.size,
        outputBytes: res.bytes,
        targetBytes,
        durationSec: info.durationSec,
        width: res.plan.targetWidth,
        height: res.plan.targetHeight,
        qualityScore,
        engine: engine.kind,
        underLimit,
      });

      if (underLimit) {
        toast.success(
          "Compressed under limit",
          `Saved ${percentSaved(file.size, res.bytes)}% · fits in your target.`,
        );
      } else {
        toast.info(
          "Compressed",
          "Result is slightly over target — try a lower resolution.",
        );
      }
    } catch (err) {
      if (controller.signal.aborted) {
        setPhase("ready");
        setProgress({ stage: "canceled", ratio: 0 });
        log({ ts: Date.now(), level: "warn", text: "Job canceled" });
        return;
      }
      log({ ts: Date.now(), level: "error", text: String(err) });
      toast.error("Compression failed", String(err));
      setPhase("error");
      setProgress({ stage: "error", ratio: 0 });
    }
  }, [
    file,
    info,
    targetBytes,
    resolution,
    quality,
    settings.hardwareAccel,
    qualityScore,
    addHistory,
    log,
  ]);

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const download = React.useCallback(() => {
    if (!result || !file) return;
    const blob = new Blob([result.data.slice() as unknown as BlobPart], {
      type: result.mime,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputName(file.name, result.ext);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [result, file]);

  const share = React.useCallback(async () => {
    if (!result || !file) return;
    const shareFile = new File([result.data.slice() as unknown as BlobPart], outputName(file.name, result.ext), {
      type: result.mime,
    });
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean;
    };
    if (nav.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: "Slip" });
        return;
      } catch {
        /* user canceled — fall through */
      }
    }
    download();
  }, [result, file, download]);

  return {
    file,
    info,
    phase,
    targetBytes,
    setTargetBytes,
    quality,
    setQuality,
    resolution,
    setResolution,
    progress,
    logs,
    result,
    plan,
    qualityScore,
    setFile,
    clear,
    start,
    cancel,
    download,
    share,
    engineReady,
    engineError,
    checkingEngine,
    checkEngine,
    locateFfmpeg,
  };
}

function outputName(original: string, ext: string): string {
  const base = original.replace(/\.[^.]+$/, "");
  return `${base}.slip.${ext}`;
}
