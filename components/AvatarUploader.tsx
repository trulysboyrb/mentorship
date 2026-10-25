"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/Avatar";
import { AVATAR_BUCKET, AVATAR_SIZE, avatarUrl, checkPickedFile, newAvatarPath, squareCrop } from "@/lib/avatar";

const btn =
  "rounded-control border border-line px-4 py-2 text-xs font-extrabold tracking-wider uppercase transition hover:border-accent disabled:opacity-50";

// Shrinks the picked photo to a small square JPEG in the browser, so uploads are tiny and fast.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) throw new Error("no blob");
    return blob;
  } finally {
    bitmap.close();
  }
}

export default function AvatarUploader({
  userId,
  fullName,
  currentPath,
}: {
  userId: string;
  fullName: string;
  currentPath: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg(null);
    const bad = checkPickedFile(file);
    if (bad) {
      setMsg({ ok: false, text: bad });
      return;
    }
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        setMsg({ ok: false, text: "We could not read that photo. Try a different one (JPG or PNG works best)." });
        return;
      }
      const supabase = createClient();
      const path = newAvatarPath(userId);
      const up = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
      });
      if (up.error) {
        setMsg({ ok: false, text: `Upload failed: ${up.error.message}` });
        return;
      }
      const { error } = await supabase.rpc("set_my_avatar", { p_path: path });
      if (error) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        setMsg({ ok: false, text: error.message });
        return;
      }
      if (currentPath && currentPath !== path) {
        await supabase.storage.from(AVATAR_BUCKET).remove([currentPath]); // tidy up the old one
      }
      setPreview(URL.createObjectURL(blob));
      setMsg({ ok: true, text: "Photo updated." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("set_my_avatar", { p_path: null });
    if (error) {
      setMsg({ ok: false, text: error.message });
      setBusy(false);
      return;
    }
    if (currentPath) await supabase.storage.from(AVATAR_BUCKET).remove([currentPath]);
    setPreview(null);
    setMsg({ ok: true, text: "Photo removed." });
    setBusy(false);
    router.refresh();
  }

  const shown = preview ?? avatarUrl(currentPath);
  const has = !!(preview || currentPath);

  return (
    <section className="mt-8 flex flex-wrap items-center gap-5 rounded-card border border-line bg-surface p-5">
      <Avatar url={shown} name={fullName} size={72} className="border border-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Profile picture</p>
        <p className="mt-1 text-xs text-muted">Shows in the top right corner. JPG, PNG or WebP.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={btn}>
            {busy ? "Working..." : has ? "Change photo" : "Add photo"}
          </button>
          {has && (
            <button type="button" disabled={busy} onClick={onRemove} className={btn}>
              Remove
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="sr-only" onChange={onPick} aria-label="Choose a profile picture" />
        {msg && (
          <p className={`mt-3 text-xs ${msg.ok ? "text-accent" : "text-danger"}`} aria-live="polite">
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
