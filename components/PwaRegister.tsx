"use client";

import { useEffect } from "react";
import type { InstallPromptEvent } from "@/lib/install";

// Mounted once in the root layout. Registers the offline page helper and catches
// the browser's "install" event early, so the Install button works on every page.
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__apexInstallPrompt = e as InstallPromptEvent;
      window.dispatchEvent(new Event("apex-install-ready"));
    };
    const onInstalled = () => {
      window.__apexInstallPrompt = null;
      window.dispatchEvent(new Event("apex-install-ready"));
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return null;
}
