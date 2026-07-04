import * as React from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "info" | "success" | "error";
interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

// Tiny external store so toasts can be fired from anywhere (incl. non-React).
let toasts: Toast[] = [];
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export const toast = {
  show(t: Omit<Toast, "id">) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { ...t, id }];
    emit();
    setTimeout(() => toast.dismiss(id), 4200);
    return id;
  },
  success: (title: string, description?: string) =>
    toast.show({ title, description, tone: "success" }),
  error: (title: string, description?: string) =>
    toast.show({ title, description, tone: "error" }),
  info: (title: string, description?: string) =>
    toast.show({ title, description, tone: "info" }),
  dismiss(id: string) {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },
};

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertTriangle,
} as const;

export function Toaster() {
  const [items, setItems] = React.useState<Toast[]>(toasts);
  React.useEffect(() => {
    const update = () => setItems([...toasts]);
    listeners.add(update);
    return () => void listeners.delete(update);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-bg-elevated/95 p-3.5 shadow-pop backdrop-blur-md animate-slide-up",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                t.tone === "success" && "text-success",
                t.tone === "error" && "text-danger",
                t.tone === "info" && "text-fg-muted",
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-2xs leading-relaxed text-fg-muted">
                  {t.description}
                </p>
              )}
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="text-fg-subtle transition-colors hover:text-fg"
              aria-label="Dismiss"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
