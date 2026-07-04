import type {
  CompressEngine,
  CompressRequest,
  CompressResult,
  EncodePlan,
  LogLine,
  MediaInput,
  Progress,
  VideoInfo,
} from "./types";
import { planEncode } from "./bitrate";

/**
 * WASM engine — runs FFmpeg entirely in the browser via ffmpeg.wasm.
 * This is the web/PWA fallback. Slower and memory-bound, but means Slip
 * works with zero install. Uses single-pass ABR (two-pass in the browser is
 * prohibitively slow); the conservative bitrate budget keeps us under target.
 */
export class WasmEngine implements CompressEngine {
  readonly kind = "wasm" as const;
  private ff: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
  private ready = false;
  private durationHint = 0;

  isReady(): boolean {
    return this.ready;
  }

  async load(onLog?: (line: LogLine) => void): Promise<void> {
    if (this.ready) return;
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");

    const ff = new FFmpeg();
    ff.on("log", ({ message }) => {
      onLog?.({ ts: Date.now(), level: "info", text: message });
    });

    const base = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
    });

    this.ff = ff;
    this.ready = true;
    onLog?.({ ts: Date.now(), level: "info", text: "FFmpeg (wasm) ready" });
  }

  async probe(input: MediaInput): Promise<VideoInfo> {
    const file = webFile(input);
    // Use an <video> element for cheap, reliable metadata in the browser.
    const meta = await readVideoMetadata(file);
    this.durationHint = meta.durationSec;
    return {
      ...meta,
      sizeBytes: file.size,
      bitrate: meta.durationSec > 0 ? (file.size * 8) / meta.durationSec : undefined,
    };
  }

  async compress(
    input: MediaInput,
    req: CompressRequest,
    handlers: {
      onProgress?: (p: Progress) => void;
      onLog?: (line: LogLine) => void;
      signal?: AbortSignal;
    },
  ): Promise<CompressResult> {
    if (!this.ff) throw new Error("Engine not loaded");
    const file = webFile(input);
    const ff = this.ff;
    const { fetchFile } = await import("@ffmpeg/util");
    const plan = planEncode(req);
    const started = performance.now();
    const duration = req.info.durationSec || this.durationHint || 1;

    const inName = "input" + extOf(file.name);
    const outName = "slip-output.mp4";

    handlers.signal?.addEventListener("abort", () => ff.terminate());

    const onProgress = ({ progress }: { progress: number }) => {
      handlers.onProgress?.({
        stage: "encoding",
        ratio: Math.min(0.99, Math.max(0, progress)),
        etaSec: undefined,
      });
    };
    ff.on("progress", onProgress);

    try {
      handlers.onProgress?.({ stage: "preparing", ratio: 0.02 });
      await ff.writeFile(inName, await fetchFile(file));

      const args = buildArgs(inName, outName, plan, req);
      handlers.onLog?.({
        ts: Date.now(),
        level: "cmd",
        text: "ffmpeg " + args.join(" "),
      });
      handlers.onProgress?.({ stage: "encoding", ratio: 0.05 });

      await ff.exec(args);

      handlers.onProgress?.({ stage: "finalizing", ratio: 0.99 });
      const out = (await ff.readFile(outName)) as Uint8Array;

      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});

      handlers.onProgress?.({ stage: "done", ratio: 1 });
      return {
        data: out,
        bytes: out.byteLength,
        mime: "video/mp4",
        ext: "mp4",
        durationMs: performance.now() - started,
        plan,
      };
    } finally {
      ff.off("progress", onProgress);
      void duration;
    }
  }
}

function buildArgs(
  input: string,
  output: string,
  plan: EncodePlan,
  req: CompressRequest,
): string[] {
  const vkbps = Math.round(plan.videoBitrate / 1000);
  const akbps = Math.round(plan.audioBitrate / 1000);
  const args = [
    "-i",
    input,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-b:v",
    `${vkbps}k`,
    "-maxrate",
    `${Math.round(vkbps * 1.15)}k`,
    "-bufsize",
    `${vkbps * 2}k`,
    "-vf",
    `scale=${plan.targetWidth}:${plan.targetHeight}:flags=bicubic`,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  ];
  if (req.info.audioCodec && akbps > 0) {
    args.push("-c:a", "aac", "-b:a", `${akbps}k`);
  } else {
    args.push("-an");
  }
  args.push("-y", output);
  return args;
}

/** The wasm engine works on the in-browser File blob. */
function webFile(input: MediaInput): File {
  if (!input.file) throw new Error("Web engine needs a File");
  return input.file;
}

function extOf(name: string): string {
  const m = /\.[a-z0-9]+$/i.exec(name);
  return m ? m[0] : ".mp4";
}

/** Read duration/size via a hidden <video>. Resolution comes from metadata. */
function readVideoMetadata(file: File): Promise<{
  durationSec: number;
  width: number;
  height: number;
  fps?: number;
  audioCodec?: string;
  codec?: string;
  sizeBytes: number;
}> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        durationSec: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        // Browsers don't expose audio-track detail reliably; assume audio.
        audioCodec: "aac",
        codec: undefined,
        sizeBytes: file.size,
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}
