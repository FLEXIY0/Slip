import type {
  CompressEngine,
  CompressRequest,
  CompressResult,
  LogLine,
  Progress,
  VideoInfo,
} from "./types";
import { planEncode } from "./bitrate";

/**
 * Native engine — delegates to the Rust/Tauri backend which drives a bundled
 * FFmpeg binary. This is the fast, full-quality path used on desktop.
 *
 * The Rust side exposes three commands:
 *   probe_video(path)      -> VideoInfo
 *   compress_video(args)   -> output path, emits `slip://progress` + `slip://log`
 *   cancel_job(jobId)
 */
export class NativeEngine implements CompressEngine {
  readonly kind = "native" as const;
  private ready = false;

  isReady(): boolean {
    return this.ready;
  }

  async load(onLog?: (line: LogLine) => void): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core");
    // Verifies FFmpeg is resolvable on the backend (bundled or system path).
    const version = await invoke<string>("ffmpeg_version");
    onLog?.({ ts: Date.now(), level: "info", text: `FFmpeg ready · ${version}` });
    this.ready = true;
  }

  async probe(file: File): Promise<VideoInfo> {
    const { invoke } = await import("@tauri-apps/api/core");
    const path = filePath(file);
    return invoke<VideoInfo>("probe_video", { path });
  }

  async compress(
    file: File,
    req: CompressRequest,
    handlers: {
      onProgress?: (p: Progress) => void;
      onLog?: (line: LogLine) => void;
      signal?: AbortSignal;
    },
  ): Promise<CompressResult> {
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");

    const plan = planEncode(req);
    const started = performance.now();
    const jobId = crypto.randomUUID();

    const unlistenProgress = await listen<Progress & { jobId: string }>(
      "slip://progress",
      (e) => {
        if (e.payload.jobId === jobId) handlers.onProgress?.(e.payload);
      },
    );
    const unlistenLog = await listen<LogLine & { jobId: string }>("slip://log", (e) => {
      if (e.payload.jobId === jobId) handlers.onLog?.(e.payload);
    });

    const onAbort = () => void invoke("cancel_job", { jobId }).catch(() => {});
    handlers.signal?.addEventListener("abort", onAbort);

    try {
      const outPath = await invoke<string>("compress_video", {
        jobId,
        path: filePath(file),
        plan,
        hardwareAccel: req.hardwareAccel,
      });

      const { readFile } = await import("@tauri-apps/plugin-fs");
      const data = await readFile(outPath);

      return {
        data,
        bytes: data.byteLength,
        mime: "video/mp4",
        ext: "mp4",
        durationMs: performance.now() - started,
        plan,
      };
    } finally {
      unlistenProgress();
      unlistenLog();
      handlers.signal?.removeEventListener("abort", onAbort);
    }
  }
}

/** Tauri exposes the real filesystem path via a non-standard File field. */
function filePath(file: File): string {
  const p = (file as unknown as { path?: string }).path;
  if (!p) throw new Error("Native engine requires a real file path");
  return p;
}
