"use client";

import { useInstall } from "@/components/useInstall";

// "Install the app" card for the Profile page.
export default function InstallApp() {
  const { canPrompt, ios, standalone, install } = useInstall();

  return (
    <section id="install" className="mt-10 scroll-mt-24">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Install the app</h2>
      <div className="mt-4 rounded-card border border-line bg-surface p-6 text-sm">
        {standalone ? (
          <p className="text-accent">You are using the installed app.</p>
        ) : canPrompt ? (
          <>
            <p className="text-muted">
              Add the academy to your home screen or desktop. It opens in its own window with
              your icon, like a normal app.
            </p>
            <button
              onClick={install}
              className="mt-4 rounded-control bg-accent px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase"
            >
              Install app
            </button>
          </>
        ) : ios ? (
          <p className="text-muted">
            On iPhone or iPad: open this page in Safari, tap the{" "}
            <span className="text-white">Share</span> button, then choose{" "}
            <span className="text-white">Add to Home Screen</span>.
          </p>
        ) : (
          <p className="text-muted">
            Open this site in Chrome or Edge to install it. On Android, you can also open the
            browser menu and choose <span className="text-white">Install app</span> or{" "}
            <span className="text-white">Add to Home screen</span>.
          </p>
        )}
      </div>
    </section>
  );
}
