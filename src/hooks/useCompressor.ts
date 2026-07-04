import * as React from "react";
import {
  getEngine,
  isNative,
  planEncode,
  estimateQualityScore,
  type CompressResult,
  type LogLine,
  type MediaInput,
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

  const [source, setSourceState] = React.useState<MediaInput | null>(null);
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

  const setSource = React.useCallback(
    async (src: MediaInput) => {
      abortRef.current?.abort();
      setSourceState(src);
      setInfo(null);
      setResult(null);
      setLogs([]);
      setProgress({ stage: "probing", ratio: 0 });
      setPhase("ready");
      try {
        const engine = getEngine();
        if (!engine.isReady()) await engine.load(log);
        const probed = await engine.probe(src);
        setInfo(probed);
        // Native path selection has no size upfront — fill it from the probe.
        if (!src.size && probed.sizeBytes) {
          setSourceState({ ...src, size: probed.sizeBytes });
        }
        setProgress({ stage: "idle", ratio: 0 });
        log({
          ts: Date.now(),
          level: "info",
          text: `Loaded ${src.name} · ${probed.width}×${probed.height} · ${probed.durationSec.toFixed(1)}s`,
        });
      } catch (err) {
        log({ ts: Date.now(), level: "error", text: String(err) });
        toast.error("Couldn't read that video", "Try a different file or format.");
        setPhase("error");
      }
    },
    [log],
  );

  /** Web entry point — a File from an <input> or HTML drag-drop. */
  const setFile = React.useCallback(
    (f: File) => setSource({ name: f.name, size: f.size, file: f }),
    [setSource],
  );

  const clear = React.useCallback(() => {
    abortRef.current?.abort();
    setSourceState(null);
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
    if (!source || !info) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("working");
    setResult(null);
    setProgress({ stage: "preparing", ratio: 0 });

    try {
      const engine = getEngine();
      if (!engine.isReady()) await engine.load(log);
      const res = await engine.compress(
        source,
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
      const inputBytes = source.size || info.sizeBytes;
      addHistory({
        name: source.name,
        inputBytes,
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
          `Saved ${percentSaved(inputBytes, res.bytes)}% · fits in your target.`,
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
    source,
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

  const download = React.useCallback(async () => {
    if (!result || !source) return;
    const filename = outputName(source.name, result.ext);

    // Native: the <a download> trick doesn't work in a Tauri webview — open a
    // real Save dialog and write the bytes where the user chooses.
    if (isNative()) {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const dest = await save({
          defaultPath: filename,
          filters: [{ name: "Video", extensions: [result.ext] }],
        });
        if (!dest) return;
        const { writeFile } = await import("@tauri-apps/plugin-fs");
        await writeFile(dest, result.data);
        const { openPath } = await import("@tauri-apps/plugin-opener");
        toast.success("Saved", dest);
        // Reveal the containing folder so the file is easy to find.
        void openPath(dest.replace(/[\\/][^\\/]+$/, "")).catch(() => {});
      } catch (err) {
        toast.error("Couldn't save the file", String(err));
      }
      return;
    }

    // Web: object-URL download.
    const blob = new Blob([result.data.slice() as unknown as BlobPart], {
      type: result.mime,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, [result, source]);

  const share = React.useCallback(async () => {
    if (!result || !source) return;
    const shareFile = new File([result.data.slice() as unknown as BlobPart], outputName(source.name, result.ext), {
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
  }, [result, source, download]);

  return {
    source,
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
    setSource,
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
