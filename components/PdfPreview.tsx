"use client";

import { useEffect, useState } from "react";

// Downloads the PDF into the browser and previews it from there.
// (Showing the storage link directly in a frame is blocked by some browsers.)
export default function PdfPreview({ src }: { src: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;

    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        setBlobUrl(url);
      })
      .catch(() => !cancelled && setFailed(true));

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
    // Loaded once. Later page refreshes must not reload the preview.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-4">
      {blobUrl ? (
        <iframe
          src={`${blobUrl}#toolbar=0&navpanes=0`}
          title="Certificate preview"
          className="h-80 w-full border border-line bg-white sm:h-[28rem]"
        />
      ) : (
        <div className="flex h-40 items-center justify-center border border-line bg-black text-xs text-muted">
          {failed ? "Preview unavailable. Use the download button." : "Loading preview..."}
        </div>
      )}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-muted hover:text-accent"
      >
        Preview not showing? Open in a new tab
      </a>
    </div>
  );
}
