import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QualityMode, ResolutionCap } from "@/engine/types";
import { uid } from "./utils";

export type ThemeMode = "system" | "light" | "dark";
export type Language = "en" | "es" | "de" | "fr" | "ja";
export type Preset = "quality" | "balanced" | "fast";

export interface Settings {
  theme: ThemeMode;
  language: Language;
  preset: Preset;
  hardwareAccel: boolean;
  ffmpegPath: string; // empty = bundled/auto
  defaultQuality: QualityMode;
  defaultResolution: ResolutionCap;
}

export interface HistoryEntry {
  id: string;
  name: string;
  createdAt: number;
  inputBytes: number;
  outputBytes: number;
  targetBytes: number;
  durationSec: number;
  width: number;
  height: number;
  qualityScore: number;
  engine: string;
  underLimit: boolean;
}

interface AppState {
  settings: Settings;
  history: HistoryEntry[];
  hasOnboarded: boolean;
  setSettings: (patch: Partial<Settings>) => void;
  addHistory: (entry: Omit<HistoryEntry, "id" | "createdAt">) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
  setOnboarded: (v: boolean) => void;
}

const defaultSettings: Settings = {
  theme: "system",
  language: "en",
  preset: "balanced",
  hardwareAccel: true,
  ffmpegPath: "",
  defaultQuality: "auto",
  defaultResolution: "source",
};

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      history: [],
      hasOnboarded: false,
      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      addHistory: (entry) =>
        set((s) => ({
          history: [
            { ...entry, id: uid(), createdAt: Date.now() },
            ...s.history,
          ].slice(0, 200),
        })),
      removeHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clearHistory: () => set({ history: [] }),
      setOnboarded: (v) => set({ hasOnboarded: v }),
    }),
    {
      name: "slip.store",
      partialize: (s) => ({
        settings: s.settings,
        history: s.history,
        hasOnboarded: s.hasOnboarded,
      }),
    },
  ),
);

/** Apply the theme class to <html>, respecting system preference. */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  try {
    localStorage.setItem("slip.theme", theme);
  } catch {
    /* ignore */
  }
}
