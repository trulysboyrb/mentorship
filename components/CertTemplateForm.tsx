"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";
import { card, ghostBtn, saveBtn, saveSettings, type Msg } from "@/components/SettingsBits";
import { buildFromTemplate, detectKind, parseLayout, type CertField, type CertLayout } from "@/lib/certificateTemplate";
import { TEMPLATE_BUCKET } from "@/lib/issueCertificate";

const MAX_MB = 8;
const FIELD_LABELS: Record<keyof CertLayout, string> = { name: "Student name", date: "Date", serial: "Certificate number" };

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <label className="block text-[11px] text-muted">
      {label}: <span className="font-bold text-white">{value}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 block w-full accent-[var(--color-accent)]" />
    </label>
  );
}

// Settings: upload the certificate template, place the name (and date / number) on it, preview, save.
export default function CertTemplateForm({ path, layout: savedLayout }: { path: string; layout: string }) {
  const router = useRouter();
  const [layout, setLayout] = useState<CertLayout>(() => parseLayout(savedLayout));
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [sample, setSample] = useState("Fatoumata Jallow");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewErr, setPreviewErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(layout) !== JSON.stringify(parseLayout(savedLayout));

  // Load the saved template so the preview can use it.
  useEffect(() => {
    let alive = true;
    setBytes(null);
    setLoadErr("");
    if (!path) return;
    createClient()
      .storage.from(TEMPLATE_BUCKET)
      .download(path)
      .then(async ({ data, error }) => {
        if (!alive) return;
        if (error || !data) return setLoadErr("The saved template file could not be loaded. Upload it again.");
        setBytes(new Uint8Array(await data.arrayBuffer()));
      });
    return () => {
      alive = false;
    };
  }, [path]);

  // Rebuild the preview shortly after anything changes.
  useEffect(() => {
    if (!bytes) {
      setPreviewUrl(null);
      return;
    }
    let alive = true;
    let url: string | null = null;
    const t = setTimeout(async () => {
      try {
        const out = await buildFromTemplate(bytes, layout, {
          name: sample || "Student Name",
          dateText: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
          serial: "AT-000000-ABC123",
        });
        if (!alive) return;
        url = URL.createObjectURL(new Blob([out.slice().buffer as ArrayBuffer], { type: "application/pdf" }));
        setPreviewUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setPreviewErr("");
      } catch (e) {
        if (alive) setPreviewErr(e instanceof Error ? e.message : "Preview failed.");
      }
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [bytes, layout, sample]);

  useEffect(() => () => setPreviewUrl((old) => (old && URL.revokeObjectURL(old), null)), []);

  const setField = (k: keyof CertLayout, patch: Partial<CertField>) =>
    setLayout((l) => ({ ...l, [k]: { ...l[k], ...patch } }));

  async function upload(file: File) {
    setMsg(null);
    if (file.size > MAX_MB * 1024 * 1024) return setMsg({ ok: false, text: `That file is too big. The limit is ${MAX_MB} MB.` });
    const data = new Uint8Array(await file.arrayBuffer());
    const kind = detectKind(data);
    if (!kind) return setMsg({ ok: false, text: "Please choose a PNG, JPG or PDF file." });
    // Make sure it really opens before we save it.
    try {
      await buildFromTemplate(data, layout, { name: "Test Name", dateText: "1 January 2026", serial: "AT-000000-ABC123" });
    } catch (e) {
      return setMsg({ ok: false, text: e instanceof Error ? e.message : "That file could not be used." });
    }
    setBusy("upload");
    const supabase = createClient();
    const newPath = `template-${Date.now()}.${kind}`;
    const mime = kind === "png" ? "image/png" : kind === "jpg" ? "image/jpeg" : "application/pdf";
    const { error: upErr } = await supabase.storage.from(TEMPLATE_BUCKET).upload(newPath, new Blob([data.slice().buffer as ArrayBuffer], { type: mime }), { contentType: mime });
    if (upErr) {
      setBusy(null);
      return setMsg({ ok: false, text: upErr.message });
    }
    const err = await saveSettings({ cert_template_path: newPath });
    if (err) {
      await supabase.storage.from(TEMPLATE_BUCKET).remove([newPath]);
      setBusy(null);
      return setMsg({ ok: false, text: err });
    }
    if (path) await supabase.storage.from(TEMPLATE_BUCKET).remove([path]);
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
    setMsg({ ok: true, text: "Template uploaded. Adjust where the name goes, then press Save layout." });
    router.refresh();
  }

  async function saveLayout() {
    setMsg(null);
    setBusy("layout");
    const err = await saveSettings({ cert_layout: JSON.stringify(layout) });
    setBusy(null);
    if (err) return setMsg({ ok: false, text: err });
    setMsg({ ok: true, text: "Saved. Give certificate now uses this layout." });
    router.refresh();
  }

  async function removeTemplate() {
    if (!window.confirm("Remove the certificate template? Give certificate will go back to the standard design.")) return;
    setMsg(null);
    setBusy("remove");
    const err = await saveSettings({ cert_template_path: "" });
    if (err) {
      setBusy(null);
      return setMsg({ ok: false, text: err });
    }
    await createClient().storage.from(TEMPLATE_BUCKET).remove([path]);
    setBusy(null);
    setMsg({ ok: true, text: "Template removed." });
    router.refresh();
  }

  return (
    <>
      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Certificate template</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Upload your designed certificate (PNG, JPG or a one page PDF, up to {MAX_MB} MB) with an empty space for the
          name. When you press Give certificate, the student&apos;s name is stamped on it and the finished PDF goes to
          the student. Only admins can see the template.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,application/pdf,.png,.jpg,.jpeg,.pdf"
            disabled={busy !== null}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            className="block text-sm text-muted file:mr-4 file:rounded-control file:border file:border-line file:bg-black file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white file:uppercase"
          />
          {path && (
            <button onClick={removeTemplate} disabled={busy !== null} className={`${ghostBtn} hover:!border-danger hover:!text-danger`}>
              Remove template
            </button>
          )}
        </div>
        {busy === "upload" && <p className="mt-2 text-xs text-muted">Uploading...</p>}
        {!path && <p className="mt-3 text-xs text-muted">No template yet. Until you upload one, the built-in certificate design is used.</p>}
        {loadErr && <p className="mt-3 text-sm text-danger">{loadErr}</p>}

        {path && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <div className="space-y-5">
              <div>
                <label className={labelCls} htmlFor="ct-sample">Preview name</label>
                <input id="ct-sample" className={inputCls} value={sample} maxLength={60} onChange={(e) => setSample(e.target.value)} />
              </div>
              {(Object.keys(FIELD_LABELS) as (keyof CertLayout)[]).map((k) => {
                const f = layout[k];
                return (
                  <fieldset key={k} className="space-y-3 border border-line p-3">
                    <legend className="px-1 text-[11px] font-extrabold tracking-widest uppercase">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={f.on} disabled={k === "name"} onChange={(e) => setField(k, { on: e.target.checked })} />
                        {FIELD_LABELS[k]}
                      </label>
                    </legend>
                    {f.on && (
                      <>
                        <Slider label="Across (%)" value={f.x} min={0} max={100} step={0.5} onChange={(n) => setField(k, { x: n })} />
                        <Slider label="Down (%)" value={f.y} min={0} max={100} step={0.5} onChange={(n) => setField(k, { y: n })} />
                        <Slider label="Size" value={f.size} min={1} max={15} step={0.1} onChange={(n) => setField(k, { size: Math.round(n * 10) / 10 })} />
                        <div className="grid grid-cols-3 gap-2">
                          <label className="text-[11px] text-muted">
                            Colour
                            <input type="color" value={f.color} onChange={(e) => setField(k, { color: e.target.value })} className="mt-1 block h-9 w-full border border-line bg-black" />
                          </label>
                          <label className="text-[11px] text-muted">
                            Font
                            <select className={`${inputCls} mt-1 !px-2 !py-2`} value={f.font} onChange={(e) => setField(k, { font: e.target.value as CertField["font"] })}>
                              <option value="serif-italic">Script style</option>
                              <option value="serif">Serif</option>
                              <option value="sans">Sans bold</option>
                            </select>
                          </label>
                          <label className="text-[11px] text-muted">
                            Align
                            <select className={`${inputCls} mt-1 !px-2 !py-2`} value={f.align} onChange={(e) => setField(k, { align: e.target.value as CertField["align"] })}>
                              <option value="center">Centre</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </label>
                        </div>
                      </>
                    )}
                  </fieldset>
                );
              })}
              <button onClick={saveLayout} disabled={busy !== null || !dirty} className={saveBtn}>
                {busy === "layout" ? "Saving..." : dirty ? "Save layout" : "Layout saved"}
              </button>
            </div>

            <div>
              <p className={labelCls}>Preview</p>
              {previewErr && <p className="text-sm text-danger">{previewErr}</p>}
              {previewUrl ? (
                <>
                  <iframe title="Certificate preview" src={previewUrl} className="h-[22rem] w-full border border-line bg-white sm:h-[28rem]" />
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted underline hover:text-white">
                    Open preview in a new tab
                  </a>
                </>
              ) : (
                !previewErr && !loadErr && <p className="text-sm text-muted">Loading preview...</p>
              )}
              <p className="mt-2 text-[11px] text-muted">
                Very long names shrink to fit. Names with letters outside A to Z (for example Arabic or Cyrillic) can not
                be printed automatically. Use &quot;upload your own PDF&quot; in Give certificate for those.
              </p>
            </div>
          </div>
        )}
        {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </>
  );
}
