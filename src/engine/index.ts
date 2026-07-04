import type { CompressEngine } from "./types";
import { NativeEngine } from "./native";
import { WasmEngine } from "./wasm";

export * from "./types";
export * from "./bitrate";

/** True when running inside a Tauri window (desktop/Android native shell). */
export function isNative(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let engine: CompressEngine | null = null;

/** Get the singleton engine appropriate for the current platform. */
export function getEngine(): CompressEngine {
  if (engine) return engine;
  engine = isNative() ? new NativeEngine() : new WasmEngine();
  return engine;
}

/** Human label for the active engine, for the UI. */
export function engineLabel(): string {
  return isNative() ? "Native · FFmpeg" : "Web · ffmpeg.wasm";
}
