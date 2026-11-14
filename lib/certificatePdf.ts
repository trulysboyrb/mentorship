// Builds a certificate PDF in the browser. Uses the standard PDF fonts, so names
// must be plain Latin letters (accents are simplified). Anything else is rejected
// with a clear message and the admin can upload a designed PDF instead.

export type CertificateInput = {
  name: string;
  courseName: string;
  dateText: string;
  serial: string;
};

export function plainText(s: string) {
  const clean = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean || /[^\x20-\x7E]/.test(clean)) {
    throw new Error(
      "This name has characters the automatic certificate cannot print. Use Give Certificate to upload a designed PDF instead."
    );
  }
  return clean;
}

export function makeSerial(date = new Date()) {
  const y = String(date.getFullYear()).slice(2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `AT-${y}${m}${d}-${rand}`;
}

export async function buildCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const name = plainText(input.name);
  const course = plainText(input.courseName);

  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate of Completion - ${name}`);
  doc.setAuthor(course);

  const W = 841.89; // A4 landscape
  const H = 595.28;
  const page = doc.addPage([W, H]);

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const script = await doc.embedFont(StandardFonts.TimesRomanBoldItalic);

  const ink = rgb(0.04, 0.04, 0.05);
  const grey = rgb(0.42, 0.44, 0.48);
  const green = rgb(0.424, 0.341, 0.62);

  // Sharp double border
  page.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: green, borderWidth: 3 });
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: ink, borderWidth: 0.6 });

  type Font = typeof bold;
  const center = (text: string, y: number, font: Font, size: number, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (W - w) / 2, y, font, size, color });
  };
  const spaced = (text: string, y: number, font: Font, size: number, color: typeof ink, gap: number) => {
    const chars = text.split("");
    const total =
      chars.reduce((sum, ch) => sum + font.widthOfTextAtSize(ch, size), 0) + gap * (chars.length - 1);
    let x = (W - total) / 2;
    for (const ch of chars) {
      page.drawText(ch, { x, y, font, size, color });
      x += font.widthOfTextAtSize(ch, size) + gap;
    }
  };

  spaced(course.toUpperCase(), H - 88, bold, 12, green, 4);
  center("CERTIFICATE", H - 150, bold, 46);
  spaced("OF COMPLETION", H - 180, regular, 14, grey, 5);

  spaced("THIS CERTIFIES THAT", H - 236, regular, 9, grey, 3);

  // Name: shrink to fit
  let size = 48;
  while (size > 20 && script.widthOfTextAtSize(name, size) > W - 220) size -= 2;
  center(name, H - 300, script, size);
  const nameW = Math.max(script.widthOfTextAtSize(name, size), 280);
  page.drawLine({
    start: { x: (W - nameW) / 2 - 20, y: H - 313 },
    end: { x: (W + nameW) / 2 + 20, y: H - 313 },
    thickness: 1,
    color: green,
  });

  center("has successfully completed all lessons of the", H - 350, regular, 14, grey);
  center(`${course} public speaking course`, H - 376, bold, 18);

  // Date (left) and signature (right)
  page.drawLine({ start: { x: 90, y: 118 }, end: { x: 270, y: 118 }, thickness: 0.6, color: ink });
  page.drawText(input.dateText, { x: 90, y: 124, font: bold, size: 12, color: ink });
  page.drawText("DATE", { x: 90, y: 102, font: regular, size: 8, color: grey });

  page.drawLine({ start: { x: W - 270, y: 118 }, end: { x: W - 90, y: 118 }, thickness: 0.6, color: ink });
  page.drawText("AUTHORISED SIGNATURE", { x: W - 270, y: 102, font: regular, size: 8, color: grey });

  center(`Certificate No. ${input.serial}`, 70, regular, 9, grey);
  center("This certificate confirms completion of the course. It is not an accredited qualification.", 54, regular, 7.5, grey);

  return doc.save();
}
