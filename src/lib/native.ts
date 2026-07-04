import { isNative } from "@/engine";

/** Detected host platform, used for the right FFmpeg install hint/link. */
export type Platform = "windows" | "macos" | "linux" | "web";

export function platform(): Platform {
  if (!isNative()) return "web";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("win")) return "windows";
  if (ua.includes("mac")) return "macos";
  return "linux";
}

/** Where to send the user to download FFmpeg, per platform. */
export const FFMPEG_DOWNLOAD: Record<Platform, string> = {
  windows: "https://www.gyan.dev/ffmpeg/builds/",
  macos: "https://evermeet.cx/ffmpeg/",
  linux: "https://ffmpeg.org/download.html",
  web: "https://ffmpeg.org/download.html",
};

/** One-line install command shown as a copyable hint. */
export const FFMPEG_INSTALL_HINT: Record<Platform, string> = {
  windows: "winget install Gyan.FFmpeg",
  macos: "brew install ffmpeg",
  linux: "sudo apt install ffmpeg",
  web: "",
};

/** Tell the Rust backend to use a specific ffmpeg binary; returns its version. */
export async function nativeSetFfmpegPath(path: string): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("set_ffmpeg_path", { path });
}

/** Open a native file picker to locate the ffmpeg executable. */
export async function pickFfmpegFile(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const isWin = platform() === "windows";
  const selected = await open({
    multiple: false,
    directory: false,
    title: "Locate the ffmpeg executable",
    filters: isWin ? [{ name: "ffmpeg", extensions: ["exe"] }] : undefined,
  });
  return typeof selected === "string" ? selected : null;
}

/** Open an external URL — native shell opener, or a new tab on the web. */
export async function openExternal(url: string): Promise<void> {
  if (!isNative()) {
    window.open(url, "_blank", "noopener");
    return;
  }
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(url);
}
