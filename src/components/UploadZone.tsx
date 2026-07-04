import * as React from "react";
import { UploadCloud, Film } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = "video/*,.mkv,.mov,.avi,.webm,.mp4,.m4v,.wmv,.flv";

export function UploadZone({ onFile, disabled }: UploadZoneProps) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current++;
        setDrag(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        dragDepth.current--;
        if (dragDepth.current <= 0) setDrag(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDrag(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled)
          inputRef.current?.click();
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center transition-all duration-150",
        "grid-lines",
        drag
          ? "border-accent bg-bg-inset scale-[0.997]"
          : "border-border-strong bg-bg-subtle hover:border-fg-subtle hover:bg-bg-inset",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div
        className={cn(
          "mb-5 flex size-14 items-center justify-center rounded-2xl border border-border bg-bg-elevated text-fg-muted shadow-sm transition-all duration-150",
          "group-hover:text-fg group-hover:scale-105",
          drag && "text-fg scale-110",
        )}
      >
        {drag ? (
          <Film className="size-6" />
        ) : (
          <UploadCloud className="size-6" />
        )}
      </div>
      <p className="text-[15px] font-medium text-fg">
        {drag ? "Drop to load your video" : "Drag & drop a video"}
      </p>
      <p className="mt-1.5 text-[13px] text-fg-muted">
        or{" "}
        <span className="font-medium text-fg underline decoration-border-strong underline-offset-2">
          browse files
        </span>{" "}
        · MP4, MOV, MKV, WebM, AVI
      </p>
    </div>
  );
}
