import { useCallback, useEffect, useState } from "react";
import type { InstallPromptEvent } from "@/lib/install";

// Tells components whether the site can be installed as an app on this device.
export function useInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const sync = () => setPrompt(window.__apexInstallPrompt ?? null);
    sync();

    const ua = navigator.userAgent;
    setIos(
      /iphone|ipad|ipod/i.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    );

    window.addEventListener("apex-install-ready", sync);
    return () => window.removeEventListener("apex-install-ready", sync);
  }, []);

  const install = useCallback(async () => {
    const p = window.__apexInstallPrompt;
    if (!p) return;
    await p.prompt();
    await p.userChoice.catch(() => null);
    window.__apexInstallPrompt = null;
    setPrompt(null);
  }, []);

  return {
    canPrompt: !!prompt && !standalone,
    ios: ios && !standalone,
    standalone,
    install,
  };
}
