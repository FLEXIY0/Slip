import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  align?: "start" | "end";
  disabled?: boolean;
}

/** Minimal, dependency-free select. Keyboard + click-outside aware. */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  className,
  align = "start",
  disabled,
}: DropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-elevated px-3 text-sm text-fg shadow-xs transition-colors",
          "hover:border-border-strong disabled:opacity-50",
          open && "border-border-strong ring-2 ring-ring/50",
        )}
      >
        <span className="truncate">{current?.label ?? "Select…"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-fg-subtle transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 min-w-full overflow-hidden rounded-lg border border-border bg-bg-elevated p-1 shadow-pop animate-scale-in",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-[7px] px-2.5 py-1.5 text-left text-sm text-fg transition-colors",
                "hover:bg-bg-inset",
                opt.value === value && "bg-bg-inset",
              )}
            >
              <span className="flex flex-col">
                <span className="font-medium">{opt.label}</span>
                {opt.hint && (
                  <span className="text-2xs text-fg-subtle">{opt.hint}</span>
                )}
              </span>
              {opt.value === value && <Check className="size-4 text-fg" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
