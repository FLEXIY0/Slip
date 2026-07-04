import type { ReactNode } from "react";
import {
  ArrowRight,
  Gauge,
  Github,
  Lock,
  MonitorSmartphone,
  Zap,
} from "lucide-react";
import { SlipMark } from "@/components/SlipMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SIZE_PRESETS } from "@/engine/bitrate";

interface LandingProps {
  onEnter: () => void;
}

export function Landing({ onEnter }: LandingProps) {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <SlipMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-tight">Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/flexiy0/slip"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="ghost" size="sm">
                <Github className="size-4" />
                <span className="hidden sm:inline">GitHub</span>
              </Button>
            </a>
            <Button size="sm" onClick={onEnter}>
              Open app
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" />
        <div className="container relative flex flex-col items-center py-20 text-center sm:py-28">
          <Badge variant="outline" className="mb-6">
            <span className="size-1.5 rounded-full bg-success" />
            Free · Open source · Runs locally
          </Badge>
          <h1 className="max-w-3xl text-balance text-display font-semibold">
            Slip videos through impossible upload limits.
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg text-fg-muted">
            Compress any video to fit strict size caps — 10, 25, 50 MB or your
            own — while keeping the highest possible quality. Drag, target,
            done.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" onClick={onEnter} className="min-w-44">
              Compress a video
              <ArrowRight />
            </Button>
            <a
              href="https://github.com/flexiy0/slip/releases"
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary" size="lg">
                Download desktop app
              </Button>
            </a>
          </div>
          <p className="mt-4 text-2xs text-fg-subtle">
            No account. No upload to a server. Your video never leaves your
            device.
          </p>

          {/* Target chips */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            {SIZE_PRESETS.map((p) => (
              <span
                key={p.label}
                className="rounded-full border border-border bg-bg-subtle px-3.5 py-1.5 text-[13px] font-medium tabular-nums text-fg-muted"
              >
                {p.label}
              </span>
            ))}
            <span className="rounded-full border border-border bg-bg-subtle px-3.5 py-1.5 text-[13px] font-medium text-fg-muted">
              Custom
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4 my-16">
        <Feature
          icon={<Gauge />}
          title="Size-accurate"
          body="Two-pass bitrate targeting lands you under the limit — not over."
        />
        <Feature
          icon={<Zap />}
          title="Native fast"
          body="Bundled FFmpeg with hardware acceleration on desktop."
        />
        <Feature
          icon={<Lock />}
          title="Fully private"
          body="Everything runs on your machine. Nothing is uploaded, ever."
        />
        <Feature
          icon={<MonitorSmartphone />}
          title="Everywhere"
          body="macOS, Windows, Linux, Android and the web — one app."
        />
      </section>

      {/* How it works */}
      <section className="container pb-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            Four steps. No thinking.
          </h2>
          <ol className="mt-10 flex flex-col gap-3">
            {[
              ["Drop a video", "Drag it in, or browse. Metadata reads instantly."],
              ["Choose a target", "Pick 10 / 25 / 50 MB or type your own."],
              ["Compress", "Slip plans the bitrate and encodes locally."],
              ["Download", "Grab a file that fits — every time."],
            ].map(([title, body], i) => (
              <li
                key={title}
                className="flex items-start gap-4 rounded-xl border border-border bg-bg-elevated p-4"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-2xs font-semibold text-accent-fg tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14px] font-medium text-fg">{title}</p>
                  <p className="mt-0.5 text-[13px] text-fg-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <Button size="lg" onClick={onEnter}>
              Open Slip
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-3 py-8 text-2xs text-fg-subtle sm:flex-row">
          <div className="flex items-center gap-2">
            <SlipMark className="size-4" />
            <span>Slip — compress video to any size limit.</span>
          </div>
          <span>MIT Licensed · Built with Tauri, React & FFmpeg</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2.5 bg-bg-elevated p-6">
      <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-bg-subtle text-fg [&_svg]:size-4">
        {icon}
      </div>
      <h3 className="text-[14px] font-semibold text-fg">{title}</h3>
      <p className="text-[13px] leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
