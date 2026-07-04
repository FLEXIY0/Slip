import * as React from "react";
import { AppShell, type Route } from "@/components/AppShell";
import { Compress } from "@/screens/Compress";
import { History } from "@/screens/History";
import { Settings } from "@/screens/Settings";
import { Landing } from "@/screens/Landing";
import { Toaster } from "@/components/ui/toast";
import { useCompressor } from "@/hooks/useCompressor";
import { applyTheme, useApp } from "@/lib/store";
import { isNative } from "@/engine";

export default function App() {
  const [route, setRoute] = React.useState<Route>("compress");
  const theme = useApp((s) => s.settings.theme);
  const hasOnboarded = useApp((s) => s.hasOnboarded);
  const setOnboarded = useApp((s) => s.setOnboarded);

  // Native shells skip the marketing landing entirely.
  const [entered, setEntered] = React.useState(isNative() || hasOnboarded);

  // One compressor instance drives the Compress screen; kept alive across
  // navigation so an in-flight job survives tab switches.
  const compressor = useCompressor();

  React.useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => theme === "system" && applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  if (!entered) {
    return (
      <>
        <Landing
          onEnter={() => {
            setEntered(true);
            setOnboarded(true);
          }}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <AppShell route={route} onNavigate={setRoute}>
        <div className={route === "compress" ? "" : "hidden"}>
          <Compress {...compressor} />
        </div>
        {route === "history" && <History />}
        {route === "settings" && <Settings />}
      </AppShell>
      <Toaster />
    </>
  );
}
