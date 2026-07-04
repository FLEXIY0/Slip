import type {
  CompressRequest,
  EncodePlan,
  QualityMode,
  ResolutionCap,
  VideoInfo,
} from "./types";

/**
 * The core of Slip: turn a target size into an encode plan.
 *
 * total_bits = target_bytes * 8
 * video_bits = total_bits * safety - audio_bits - container_overhead
 * video_bitrate = video_bits / duration
 *
 * We reserve headroom because muxing, keyframes and rate-control drift push
 * the real file slightly over the requested bitrate. Landing *under* the
 * limit is the whole point, so we bias conservative.
 */

const RESOLUTION_HEIGHTS: Record<ResolutionCap, number> = {
  source: Infinity,
  "1080p": 1080,
  "720p": 720,
  "480p": 480,
};

/** Safety multiplier applied to the total budget per quality mode. */
const SAFETY: Record<QualityMode, number> = {
  auto: 0.93,
  quality: 0.95,
  balanced: 0.92,
  small: 0.9,
};

/** Container overhead estimate (bytes) — MP4 muxing, moov atom, etc. */
function containerOverhead(durationSec: number): number {
  // ~ small fixed cost + per-second overhead
  return 24 * 1024 + durationSec * 1500;
}

/** Choose an audio bitrate that scales down for very tight budgets. */
export function pickAudioBitrate(targetBytes: number, durationSec: number): number {
  if (durationSec <= 0) return 128_000;
  const totalKbps = (targetBytes * 8) / durationSec / 1000;
  if (totalKbps < 400) return 64_000;
  if (totalKbps < 900) return 96_000;
  return 128_000;
}

/** Round dimensions to even numbers (required by most H.264/H.265 encoders). */
function even(n: number): number {
  return Math.max(2, Math.round(n / 2) * 2);
}

/** Compute target dimensions honouring the resolution cap and aspect ratio. */
export function resolveDimensions(
  info: VideoInfo,
  cap: ResolutionCap,
): { width: number; height: number } {
  const capHeight = RESOLUTION_HEIGHTS[cap];
  if (!info.width || !info.height) {
    const h = Number.isFinite(capHeight) ? capHeight : 720;
    return { width: even((h * 16) / 9), height: even(h) };
  }
  if (info.height <= capHeight) {
    return { width: even(info.width), height: even(info.height) };
  }
  const scale = capHeight / info.height;
  return { width: even(info.width * scale), height: even(info.height * scale) };
}

/**
 * When the source is already smaller than the target, there's nothing to gain
 * from re-encoding to a *higher* bitrate — cap at the source bitrate.
 */
export function planEncode(req: CompressRequest): EncodePlan {
  const { info, targetBytes, resolutionCap, quality } = req;
  const duration = Math.max(0.1, info.durationSec);
  const safety = SAFETY[quality];

  const audioBitrate = info.audioCodec ? pickAudioBitrate(targetBytes, duration) : 0;

  const totalBits = targetBytes * 8 * safety;
  const overheadBits = containerOverhead(duration) * 8;
  const audioBits = audioBitrate * duration;
  let videoBits = totalBits - audioBits - overheadBits;
  if (videoBits < 0) videoBits = totalBits * 0.85;

  let videoBitrate = Math.floor(videoBits / duration);

  // Don't upscale bitrate beyond the source — pointless quality-wise.
  if (info.bitrate && info.bitrate > 0) {
    const sourceVideoBitrate = Math.max(0, info.bitrate - audioBitrate);
    if (sourceVideoBitrate > 0) {
      videoBitrate = Math.min(videoBitrate, Math.floor(sourceVideoBitrate * 0.98));
    }
  }

  // Floor to keep output watchable.
  videoBitrate = Math.max(videoBitrate, 90_000);

  const { width, height } = resolveDimensions(info, resolutionCap);

  const estimatedBytes = Math.round(
    ((videoBitrate + audioBitrate) * duration) / 8 + containerOverhead(duration),
  );

  // Confidence that we land under target.
  const fit = clamp01(1 - estimatedBytes / targetBytes + 0.02);

  // Two-pass gives far better size accuracy; skip only for very short clips.
  const twoPass = duration > 3 && quality !== "quality" ? true : duration > 6;

  return {
    videoBitrate,
    audioBitrate,
    targetWidth: width,
    targetHeight: height,
    estimatedBytes,
    twoPass,
    fit,
  };
}

/** Predicted quality label (0..100) derived from bits-per-pixel-per-frame. */
export function estimateQualityScore(plan: EncodePlan, info: VideoInfo): number {
  const fps = info.fps && info.fps > 0 ? info.fps : 30;
  const pixels = plan.targetWidth * plan.targetHeight;
  if (pixels <= 0) return 0;
  const bpp = plan.videoBitrate / (pixels * fps);
  // Empirical mapping: ~0.1 bpp ≈ excellent, ~0.02 bpp ≈ poor.
  const score = clamp01((bpp - 0.015) / (0.12 - 0.015)) * 100;
  return Math.round(score);
}

export function qualityLabel(score: number): {
  label: string;
  tone: "good" | "ok" | "low";
} {
  if (score >= 66) return { label: "Excellent", tone: "good" };
  if (score >= 38) return { label: "Good", tone: "ok" };
  return { label: "Reduced", tone: "low" };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Standard target-size presets in bytes (MiB-based, matching most platforms). */
export const SIZE_PRESETS = [
  { label: "10 MB", bytes: 10 * 1024 * 1024, hint: "Discord free" },
  { label: "25 MB", bytes: 25 * 1024 * 1024, hint: "Gmail" },
  { label: "50 MB", bytes: 50 * 1024 * 1024, hint: "Discord Nitro Basic" },
  { label: "100 MB", bytes: 100 * 1024 * 1024, hint: "WhatsApp" },
] as const;
