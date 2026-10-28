// Stamps a student's name (and optionally the date and certificate number) onto a certificate
// template the admin uploaded (PNG, JPG or PDF). Runs in the admin's browser, like the built-in
// certificate maker. Positions are percentages of the page, so they work for any template size.
import { plainText } from "./certificatePdf";

export type CertFont = "serif-italic" | "serif" | "sans";
export type CertAlign = "left" | "center" | "right";

export type CertField = {
  on: boolean;
  x: number; // % from the left edge of the page (0 to 100)
  y: number; // % from the top edge of the page (0 to 100): the middle of the text line
  size: number; // text height as % of page width (1 to 15)
  color: string; // #rrggbb
  font: CertFont;
  align: CertAlign;
};

export type CertLayout = { name: CertField; date: CertField; serial: CertField };
export type CertKind = "png" | "jpg" | "pdf";

export const DEFAULT_LAYOUT: CertLayout = {
  name: { on: true, x: 50, y: 52, size: 5.5, color: "#111111", font: "serif-italic", align: "center" },
  date: { on: false, x: 25, y: 84, size: 1.8, color: "#333333", font: "sans", align: "center" },
  serial: { on: false, x: 50, y: 95, size: 1.3, color: "#555555", font: "sans", align: "center" },
};

const num = (v: unknown, min: number, max: number, fb: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};

function parseField(raw: unknown, d: CertField): CertField {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    on: typeof r.on === "boolean" ? r.on : d.on,
    x: num(r.x, 0, 100, d.x),
    y: num(r.y, 0, 100, d.y),
    size: num(r.size, 1, 15, d.size),
    color: typeof r.color === "string" && /^#[0-9a-fA-F]{6}$/.test(r.color) ? r.color.toLowerCase() : d.color,
    font: r.font === "serif" || r.font === "sans" || r.font === "serif-italic" ? r.font : d.font,
    align: r.align === "left" || r.align === "right" || r.align === "center" ? r.align : d.align,
  };
}

// Never throws: junk or empty input gives the default layout.
export function parseLayout(raw: unknown): CertLayout {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = raw.trim() ? JSON.parse(raw) : {};
    } catch {
      v = {};
    }
  }
  const r = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    name: parseField(r.name, DEFAULT_LAYOUT.name),
    date: parseField(r.date, DEFAULT_LAYOUT.date),
    serial: parseField(r.serial, DEFAULT_LAYOUT.serial),
  };
}

export function detectKind(b: Uint8Array): CertKind | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return "pdf";
  return null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export type StampInput = { name: string; dateText: string; serial: string };

const PAGE_W = 841.89; // A4 landscape width in points; image templates get this width

export async function buildFromTemplate(
  bytes: Uint8Array,
  layoutIn: unknown,
  input: StampInput
): Promise<Uint8Array> {
  const kind = detectKind(bytes);
  if (!kind) throw new Error("The certificate template must be a PNG, JPG or PDF file.");
  const layout = parseLayout(layoutIn);
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const name = plainText(input.name); // throws the friendly message for unprintable characters
  const out = await PDFDocument.create();
  out.setTitle(`Certificate - ${name}`);

  let W = PAGE_W;
  let H = 595.28;
  let page;
  if (kind === "pdf") {
    const src = await PDFDocument.load(bytes);
    if (src.getPageCount() < 1) throw new Error("The template PDF has no pages.");
    const [embedded] = await out.embedPdf(src, [0]); // first page only
    W = embedded.width;
    H = embedded.height;
    page = out.addPage([W, H]);
    page.drawPage(embedded, { x: 0, y: 0, width: W, height: H });
  } else {
    const img = kind === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
    H = (PAGE_W * img.height) / img.width;
    page = out.addPage([W, H]);
    page.drawImage(img, { x: 0, y: 0, width: W, height: H });
  }

  const fonts = {
    "serif-italic": await out.embedFont(StandardFonts.TimesRomanBoldItalic),
    serif: await out.embedFont(StandardFonts.TimesRoman),
    sans: await out.embedFont(StandardFonts.HelveticaBold),
  };

  const stamp = (text: string, f: CertField) => {
    if (!f.on || !text) return;
    const font = fonts[f.font];
    const px = (f.x / 100) * W;
    const available = f.align === "center" ? 2 * Math.min(px, W - px) : f.align === "left" ? W - px : px;
    const maxW = Math.max(20, Math.min(0.8 * W, available));
    let size = (f.size / 100) * W;
    while (size > 6 && font.widthOfTextAtSize(text, size) > maxW) size -= 0.5; // long names shrink to fit (down to 6pt)
    const w = font.widthOfTextAtSize(text, size);
    const x = f.align === "center" ? px - w / 2 : f.align === "left" ? px : px - w;
    const y = H - (f.y / 100) * H - size * 0.3; // y is the middle of the line
    const [r, g, b] = hexToRgb(f.color);
    page.drawText(text, { x, y, size, font, color: rgb(r, g, b) });
  };

  stamp(name, layout.name);
  stamp(plainText(input.dateText), layout.date);
  stamp(plainText(input.serial), layout.serial);
  return out.save();
}
