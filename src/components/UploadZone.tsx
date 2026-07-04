import * as React from "react";
import { UploadCloud, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaInput } from "@/engine";
import { isNative } from "@/engine";
import { basename, onNativeFileDrop, pickVideoFile } from "@/lib/native";

interface UploadZoneProps {
  onSelect: (input: MediaInput) => void;
  disabled?: boolean;
}

const ACCEPT = "video/*,.mkv,.mov,.avi,.webm,.mp4,.m4v,.wmv,.flv";
const native = isNative();

export function UploadZone({ onSelect, disabled }: UploadZoneProps) {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dragDepth = React.useRef(0);

  // Native: files come from Tauri's OS drag-drop (HTML drop has no path).
  React.useEffect(() => {
    if (!native) return;
    let unlisten: (() => void) | undefined;
    let active = true;
    onNativeFileDrop({
      onHover: (over) => setDrag(over),
      onDrop: (paths) => {
        setDrag(false);
        const p = paths[0];
        if (p && !disabled) onSelect({ name: basename(p), size: 0, path: p });
      },
    }).then((fn) => {
      if (active) unlisten = fn;
      else fn();
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [onSelect, disabled]);

  const openPicker = async () => {
    if (disabled) return;
    if (native) {
      const p = await pickVideoFile();
      if (p) onSelect({ name: basename(p), size: 0, path: p });
    } else {
      inputRef.current?.click();
    }
  };

  const handleWebFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onSelect({ name: file.name, size: file.size, file });
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
        // Native drops are handled by the Tauri listener above.
        if (!native && !disabled) handleWebFiles(e.dataTransfer.files);
      }}
      onClick={() => void openPicker()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void openPicker();
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
      {!native && (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleWebFiles(e.target.files)}
        />
      )}
      <div
        className={cn(
          "mb-5 flex size-14 items-center justify-center rounded-2xl border border-border bg-bg-elevated text-fg-muted shadow-sm transition-all duration-150",
          "group-hover:text-fg group-hover:scale-105",
          drag && "text-fg scale-110",
        )}
      >
        {drag ? <Film className="size-6" /> : <UploadCloud className="size-6" />}
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
