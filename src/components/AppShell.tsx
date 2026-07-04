import * as React from "react";
import { Zap, History as HistoryIcon, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { engineLabel, isNative } from "@/engine";
import { SlipMark } from "./SlipMark";

export type Route = "compress" | "history" | "settings";

const NAV: { id: Route; label: string; icon: React.ElementType }[] = [
  { id: "compress", label: "Compress", icon: Zap },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

interface AppShellProps {
  route: Route;
  onNavigate: (r: Route) => void;
  children: React.ReactNode;
}

export function AppShell({ route, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-fg">
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-bg-subtle md:flex">
        <div className="drag-region flex h-14 items-center gap-2.5 px-5">
          <SlipMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-tight">Slip</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV.map((item) => (
            <NavButton
              key={item.id}
              active={route === item.id}
              onClick={() => onNavigate(item.id)}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>
        <div className="border-t border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-success" />
            <span className="text-2xs text-fg-muted">{engineLabel()}</span>
          </div>
          <p className="mt-1 text-2xs text-fg-subtle">
            {isNative() ? "Desktop" : "Web"} · v1.0.0
          </p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 md:hidden">
          <div className="flex items-center gap-2">
            <SlipMark className="size-5" />
            <span className="text-[15px] font-semibold tracking-tight">Slip</span>
          </div>
          <span className="text-2xs text-fg-subtle">{engineLabel()}</span>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-bg-elevated/90 px-2 pb-[env(safe-area-inset-bottom)] pt-1.5 backdrop-blur-lg md:hidden">
          {NAV.map((item) => {
            const active = route === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-2xs font-medium transition-colors",
                  active ? "text-fg" : "text-fg-subtle",
                )}
              >
                <Icon className={cn("size-5", active && "text-fg")} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
        active
          ? "bg-bg-inset text-fg"
          : "text-fg-muted hover:bg-bg-inset/60 hover:text-fg",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
