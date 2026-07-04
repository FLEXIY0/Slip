import * as React from "react";
import { Cpu, FolderOpen, Github, Heart } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  applyTheme,
  useApp,
  type Language,
  type Preset,
  type ThemeMode,
} from "@/lib/store";
import { engineLabel, isNative } from "@/engine";
import { nativeSetFfmpegPath, pickFfmpegFile } from "@/lib/native";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ja", label: "日本語" },
];

const PRESETS: { value: Preset; label: string; hint: string }[] = [
  { value: "quality", label: "Quality", hint: "Slower · best fidelity" },
  { value: "balanced", label: "Balanced", hint: "Recommended" },
  { value: "fast", label: "Fast", hint: "Quicker · larger margin" },
];

export function Settings() {
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);

  const applyFfmpegPath = async (path: string) => {
    setSettings({ ffmpegPath: path });
    if (!isNative()) return;
    try {
      const version = await nativeSetFfmpegPath(path);
      if (path) toast.success("FFmpeg connected", version);
    } catch (err) {
      toast.error("FFmpeg not found at that path", String(err));
    }
  };

  const browseFfmpeg = async () => {
    const picked = await pickFfmpegFile();
    if (picked) void applyFfmpegPath(picked);
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          Settings
        </h1>
        <p className="text-[15px] text-fg-muted">
          Sensible defaults. Change only what you need.
        </p>
      </header>

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-bg-elevated">
        <Row title="Theme" description="Appearance across the app.">
          <Dropdown
            className="w-40"
            align="end"
            value={settings.theme}
            options={THEMES}
            onChange={(v) => {
              setSettings({ theme: v });
              applyTheme(v);
            }}
          />
        </Row>

        <Row title="Language" description="Interface language.">
          <Dropdown
            className="w-40"
            align="end"
            value={settings.language}
            options={LANGUAGES}
            onChange={(v) => setSettings({ language: v })}
          />
        </Row>

        <Row
          title="Compression preset"
          description="Trade encode speed against precision."
        >
          <Dropdown
            className="w-44"
            align="end"
            value={settings.preset}
            options={PRESETS}
            onChange={(v) => setSettings({ preset: v })}
          />
        </Row>

        <Row
          title="Hardware acceleration"
          description={
            isNative()
              ? "Use GPU encoders when available."
              : "Only available in the desktop app."
          }
        >
          <Toggle
            checked={settings.hardwareAccel && isNative()}
            disabled={!isNative()}
            onChange={(v) => setSettings({ hardwareAccel: v })}
          />
        </Row>

        <Row
          title="FFmpeg path"
          description="Leave blank to use the bundled binary."
        >
          <div className="flex w-full max-w-xs items-center gap-2">
            <Input
              placeholder={isNative() ? "Auto (bundled)" : "Web uses ffmpeg.wasm"}
              value={settings.ffmpegPath}
              disabled={!isNative()}
              onChange={(e) => setSettings({ ffmpegPath: e.target.value })}
              onBlur={(e) => void applyFfmpegPath(e.target.value)}
              className="font-mono text-2xs"
            />
            <Button
              variant="secondary"
              size="icon"
              disabled={!isNative()}
              onClick={browseFfmpeg}
              aria-label="Browse"
            >
              <FolderOpen className="size-4" />
            </Button>
          </div>
        </Row>
      </div>

      {/* Engine info */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-bg-subtle p-4">
        <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-fg-muted">
          <Cpu className="size-4" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-medium text-fg">Compression engine</p>
          <p className="text-2xs text-fg-muted">{engineLabel()}</p>
        </div>
        <Badge variant="success">Ready</Badge>
      </div>

      <footer className="mt-8 flex items-center justify-between text-2xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          Made with <Heart className="size-3 fill-current" /> for tight upload
          limits
        </span>
        <a
          href="https://github.com/flexiy0/slip"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-fg"
        >
          <Github className="size-3.5" />
          Slip v1.0.0
        </a>
      </footer>
    </div>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-2xs text-fg-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-150 disabled:opacity-40",
        checked ? "bg-accent" : "bg-bg-inset border border-border",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-bg-elevated shadow-sm transition-transform duration-150",
          checked ? "translate-x-[18px]" : "translate-x-1",
        )}
      />
    </button>
  );
}
