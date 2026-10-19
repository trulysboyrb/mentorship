// Types for the browser's "install this app" prompt.
export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __apexInstallPrompt?: InstallPromptEvent | null;
  }
}
