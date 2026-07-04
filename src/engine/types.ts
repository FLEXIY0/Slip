/** Shared types for the Slip compression engine (native + wasm). */

export type EngineKind = "native" | "wasm";

/**
 * A selected video, abstracted over platform:
 *  - Web supplies a `File` blob (used by ffmpeg.wasm + object-URL preview).
 *  - Native (Tauri) supplies a real filesystem `path` (used by FFmpeg +
 *    the asset-protocol preview). HTML File objects have no path in Tauri v2.
 */
export interface MediaInput {
  name: string;
  size: number;
  file?: File;
  path?: string;
}

/** Metadata probed from an input video. */
export interface VideoInfo {
  durationSec: number;
  width: number;
  height: number;
  /** Overall source bitrate in bits/sec, if known. */
  bitrate?: number;
  fps?: number;
  codec?: string;
  audioCodec?: string;
  sizeBytes: number;
}

/** A quality tier the user can pick from. */
export type QualityMode = "auto" | "quality" | "balanced" | "small";

/** Preset resolution ceilings. `source` keeps native resolution. */
export type ResolutionCap = "source" | "1080p" | "720p" | "480p";

export interface CompressRequest {
  /** Target output size in bytes. */
  targetBytes: number;
  info: VideoInfo;
  resolutionCap: ResolutionCap;
  quality: QualityMode;
  /** Prefer hardware encoders where available (native only). */
  hardwareAccel: boolean;
}

/** The plan derived from a request — what we'll actually ask FFmpeg to do. */
export interface EncodePlan {
  videoBitrate: number; // bits/sec
  audioBitrate: number; // bits/sec
  targetWidth: number;
  targetHeight: number;
  /** Predicted output size in bytes at this plan. */
  estimatedBytes: number;
  twoPass: boolean;
  /** 0..1 confidence that the result lands under target. */
  fit: number;
}

export type JobStage =
  | "idle"
  | "preparing"
  | "probing"
  | "pass1"
  | "pass2"
  | "encoding"
  | "finalizing"
  | "done"
  | "error"
  | "canceled";

export interface Progress {
  stage: JobStage;
  /** 0..1 overall. */
  ratio: number;
  fps?: number;
  speed?: number; // encode speed multiplier (e.g. 3.2x)
  etaSec?: number;
  message?: string;
}

export interface CompressResult {
  data: Uint8Array;
  bytes: number;
  mime: string;
  ext: string;
  durationMs: number;
  plan: EncodePlan;
}

export type LogLevel = "info" | "warn" | "error" | "cmd";

export interface LogLine {
  ts: number;
  level: LogLevel;
  text: string;
}

export interface CompressEngine {
  readonly kind: EngineKind;
  /** True once the engine is ready to accept jobs. */
  isReady(): boolean;
  load(onLog?: (line: LogLine) => void): Promise<void>;
  probe(input: MediaInput): Promise<VideoInfo>;
  compress(
    input: MediaInput,
    req: CompressRequest,
    handlers: {
      onProgress?: (p: Progress) => void;
      onLog?: (line: LogLine) => void;
      signal?: AbortSignal;
    },
  ): Promise<CompressResult>;
}
