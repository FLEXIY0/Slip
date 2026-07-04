import * as React from "react";
import { Play, Pause, X, Clock, Maximize2, FileVideo } from "lucide-react";
import type { VideoInfo } from "@/engine/types";
import { cn, formatBytes, formatDuration } from "@/lib/utils";
import { Button } from "./ui/button";

interface VideoPreviewProps {
  file: File;
  info: VideoInfo | null;
  onRemove: () => void;
}

export function VideoPreview({ file, info, onRemove }: VideoPreviewProps) {
  const url = React.useMemo(() => URL.createObjectURL(file), [file]);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xs">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={url}
          className="h-full w-full object-contain"
          onEnded={() => setPlaying(false)}
          onClick={toggle}
          playsInline
        />
        <button
          onClick={toggle}
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
            playing ? "opacity-0 hover:opacity-100" : "opacity-100",
          )}
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform hover:scale-105">
            {playing ? (
              <Pause className="size-5" />
            ) : (
              <Play className="size-5 translate-x-0.5" />
            )}
          </span>
        </button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={onRemove}
          className="no-drag-region absolute right-2.5 top-2.5 bg-black/50 text-white border-transparent hover:bg-black/70 backdrop-blur-sm"
          aria-label="Remove video"
        >
          <X />
        </Button>
      </div>

      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex items-center gap-2">
          <FileVideo className="size-4 shrink-0 text-fg-subtle" />
          <p className="truncate text-[13px] font-medium text-fg" title={file.name}>
            {file.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-2xs text-fg-muted">
          <Meta icon={<FileVideo className="size-3" />} value={formatBytes(file.size)} />
          {info && info.durationSec > 0 && (
            <Meta
              icon={<Clock className="size-3" />}
              value={formatDuration(info.durationSec)}
            />
          )}
          {info && info.width > 0 && (
            <Meta
              icon={<Maximize2 className="size-3" />}
              value={`${info.width}×${info.height}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums">
      <span className="text-fg-subtle">{icon}</span>
      {value}
    </span>
  );
}
