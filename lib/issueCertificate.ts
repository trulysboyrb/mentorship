import type { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/config";
import { buildCertificatePdf, makeSerial } from "@/lib/certificatePdf";
import { buildFromTemplate } from "@/lib/certificateTemplate";

type Supabase = ReturnType<typeof createClient>;

// The admin's uploaded template (path inside the "certificate-templates" bucket) and its layout JSON.
export type CertTemplate = { path: string; layout: string } | null;

export const TEMPLATE_BUCKET = "certificate-templates";

// Builds the certificate (from the uploaded template if there is one, otherwise the built-in design),
// stores the PDF and records it for the student. Cleans up the file if the record can not be saved.
// Throws an Error with a plain message.
export async function issueCertificate(
  supabase: Supabase,
  student: { id: string; full_name: string },
  template: CertTemplate
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please log in again.");

  const now = new Date();
  const serial = makeSerial(now);
  const dateText = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  let bytes: Uint8Array;
  if (template) {
    const { data, error } = await supabase.storage.from(TEMPLATE_BUCKET).download(template.path);
    if (error || !data) {
      throw new Error("The certificate template could not be loaded. Check Settings > Certificate template.");
    }
    bytes = await buildFromTemplate(new Uint8Array(await data.arrayBuffer()), template.layout, {
      name: student.full_name,
      dateText,
      serial,
    });
  } else {
    bytes = await buildCertificatePdf({ name: student.full_name, courseName: BRAND, dateText, serial });
  }

  const path = `${student.id}/${Date.now()}-certificate-of-completion.pdf`;
  const { error: upErr } = await supabase.storage
    .from("certificates")
    .upload(path, new Blob([bytes.slice().buffer as ArrayBuffer], { type: "application/pdf" }), {
      contentType: "application/pdf",
    });
  if (upErr) throw new Error(upErr.message);

  const { error: dbErr } = await supabase.from("certificates").insert({
    user_id: student.id,
    title: "Certificate of Completion",
    file_path: path,
    issued_by: user.id,
    serial,
  });
  if (dbErr) {
    await supabase.storage.from("certificates").remove([path]);
    throw new Error(dbErr.message);
  }
}
