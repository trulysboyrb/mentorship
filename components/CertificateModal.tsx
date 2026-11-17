"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";
import { issueCertificate, type CertTemplate } from "@/lib/issueCertificate";

const BUCKET = "certificates";
const MAX_MB = 10;

export type CertItem = { id: string; title: string; file_path: string };

const smallBtn =
  "rounded-control border border-line px-3 py-1.5 text-xs font-semibold tracking-wider text-muted uppercase hover:border-accent hover:text-white disabled:opacity-40";

// A real PDF starts with the bytes "%PDF". This blocks renamed non-PDF files.
async function looksLikePdf(file: File) {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head).startsWith("%PDF");
}

export default function CertificateModal({
  student,
  certificates,
  template = null,
  onClose,
}: {
  student: { id: string; full_name: string };
  certificates: CertItem[];
  template?: CertTemplate;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("Certificate of Completion");
  const [file, setFile] = useState<File | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [stamping, setStamping] = useState(false);

  // Uses the template from Settings: puts this student's name on it and issues the PDF.
  async function fromTemplate() {
    if (!template) return;
    if (!window.confirm(`Put ${student.full_name}'s name on the certificate template and issue it?`)) return;
    setError("");
    setStamping(true);
    try {
      await issueCertificate(supabase, student, template);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setStamping(false);
  }

  async function give(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) return setError("Please enter a title.");
    if (!file) return setError("Please choose a PDF file.");
    if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf")
      return setError("Only PDF files are allowed.");
    if (file.size > MAX_MB * 1024 * 1024)
      return setError(`That file is too big. The limit is ${MAX_MB} MB.`);
    if (!(await looksLikePdf(file)))
      return setError("That file is not a real PDF. Export it as a PDF and try again.");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return setError("Please log in again.");

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${student.id}/${Date.now()}-${safeName}`;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${BUCKET}/${path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;

    setPct(0);
    const failure = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setPct(Math.round((ev.loaded / ev.total) * 100));
      };
      xhr.onload = () =>
        resolve(
          xhr.status >= 200 && xhr.status < 300
            ? null
            : `Upload failed (${xhr.status}): ${xhr.responseText}`
        );
      xhr.onerror = () => resolve("Network error. Check your connection and try again.");
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      xhr.send(form);
    });

    if (failure) {
      setPct(null);
      return setError(failure);
    }

    const { error: dbError } = await supabase.from("certificates").insert({
      user_id: student.id,
      title: title.trim(),
      file_path: path,
      issued_by: session.user.id,
    });

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan file
      setPct(null);
      return setError(dbError.message);
    }

    setPct(null);
    setFile(null);
    setTitle("Certificate of Completion");
    router.refresh();
  }

  async function remove(c: CertItem) {
    if (!window.confirm(`Remove "${c.title}" from ${student.full_name}?`)) return;
    setError("");
    await supabase.storage.from(BUCKET).remove([c.file_path]);
    const { error } = await supabase.from("certificates").delete().eq("id", c.id);
    if (error) setError(error.message);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight">Give Certificate</h3>
            <p className="mt-1 text-sm text-muted">{student.full_name}</p>
          </div>
          <button onClick={onClose} className={smallBtn}>Close</button>
        </div>

        {error && (
          <p role="alert" className="mt-4 break-words rounded-control border border-danger p-3 text-sm text-danger">{error}</p>
        )}

        <h4 className="mt-6 text-[10px] font-extrabold tracking-widest text-muted uppercase">
          Issued certificates
        </h4>
        {certificates.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No certificates yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {certificates.map((c) => (
              <li key={c.id}
                className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-2 px-4 py-3 text-sm">
                <span className="truncate">{c.title}</span>
                <button onClick={() => remove(c)}
                  className={`${smallBtn} hover:!border-danger hover:!text-danger`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t border-line pt-6">
          <h4 className="text-[10px] font-extrabold tracking-widest text-muted uppercase">From your template</h4>
          {template ? (
            <>
              <p className="mt-2 text-sm text-muted">
                Puts {student.full_name}&apos;s name on the certificate template you uploaded in Settings.
              </p>
              <button
                type="button"
                onClick={fromTemplate}
                disabled={stamping || pct !== null}
                className="mt-3 w-full rounded-control bg-accent px-6 py-3.5 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50"
              >
                {stamping ? "Making certificate..." : "Give certificate from template"}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">
              No template yet. Upload one in Settings &gt; Certificate template and this button will put the
              student&apos;s name on it automatically.
            </p>
          )}
        </div>

        <h4 className="mt-6 text-[10px] font-extrabold tracking-widest text-muted uppercase">Or upload your own PDF</h4>
        <form onSubmit={give} className="mt-6 space-y-5 border-t border-line pt-6">
          <div>
            <label className={labelCls} htmlFor="cert_title">Certificate title</label>
            <input id="cert_title" className={inputCls} value={title}
              onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="cert_file">PDF file (max {MAX_MB} MB)</label>
            <input
              id="cert_file"
              type="file"
              accept="application/pdf,.pdf"
              disabled={pct !== null}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-4 file:rounded-control file:border file:border-line file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:uppercase"
            />
          </div>

          {pct !== null && (
            <div>
              <div className="h-1 w-full bg-line">
                <div className="h-1 bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">Uploading... {pct}%</p>
            </div>
          )}

          <button type="submit" disabled={pct !== null}
            className="w-full rounded-control bg-accent px-6 py-3.5 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-50">
            Give Certificate
          </button>
        </form>
      </div>
    </div>
  );
}
