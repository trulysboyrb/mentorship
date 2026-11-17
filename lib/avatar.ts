// Profile picture helpers (pure, so they can be tested without a browser).

export const AVATAR_BUCKET = "avatars";
export const AVATAR_SIZE = 256; // pixels, square
export const MAX_PICK_BYTES = 12 * 1024 * 1024; // the photo the student picks (before shrinking)
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function avatarUrl(path: string | null | undefined): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!path || !base) return null;
  // The path is "<user id>/<timestamp>.jpg"; encode each part for safety.
  const safe = path.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${AVATAR_BUCKET}/${safe}`;
}

export function checkPickedFile(f: { type: string; size: number }): string | null {
  if (!OK_TYPES.includes((f.type || "").toLowerCase())) return "Please choose a JPG, PNG or WebP photo.";
  if (f.size > MAX_PICK_BYTES) return "That photo is too big. Please choose one under 12 MB.";
  if (f.size === 0) return "That file is empty.";
  return null;
}

// Centre square crop of a w x h image, to be drawn at AVATAR_SIZE x AVATAR_SIZE.
export function squareCrop(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.max(1, Math.min(w, h));
  return { sx: Math.max(0, Math.floor((w - side) / 2)), sy: Math.max(0, Math.floor((h - side) / 2)), side };
}

export function newAvatarPath(userId: string, now = Date.now()): string {
  return `${userId}/${now}.jpg`;
}
