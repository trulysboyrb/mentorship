"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BannerTone, SiteStatus } from "@/lib/siteSettings";
import { inputCls, labelCls } from "@/components/ui";
import { Switch, card, saveBtn, saveSettings, type Msg } from "@/components/SettingsBits";

const TONE_PREVIEW: Record<BannerTone, string> = {
  info: "border border-line bg-surface-2 text-white",
  success: "border border-accent/50 bg-accent/10 text-accent",
  warning: "border border-danger/50 bg-danger/10 text-danger",
};

// Settings: the site-wide banner, and the contact details shown on the Contact Us page.
export default function SiteMessagesForm({ status }: { status: SiteStatus }) {
  const router = useRouter();
  const [bOn, setBOn] = useState(status.banner_on);
  const [bText, setBText] = useState(status.banner_text);
  const [bTone, setBTone] = useState<BannerTone>(status.banner_tone);
  const [bMsg, setBMsg] = useState<Msg>(null);

  const [biz, setBiz] = useState(status.contact_business);
  const [wa, setWa] = useState(status.contact_whatsapp);
  const [mail, setMail] = useState(status.contact_email);
  const [hours, setHours] = useState(status.contact_hours);
  const [cMsg, setCMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function saveBanner() {
    setBMsg(null);
    setBusy("banner");
    const err = await saveSettings({ banner_on: bOn ? "1" : "0", banner_text: bText.trim(), banner_tone: bTone });
    setBusy(null);
    if (err) return setBMsg({ ok: false, text: err });
    setBMsg({
      ok: true,
      text: bOn && bText.trim() ? "Saved. Students see it at the top of their pages within a couple of minutes." : "Saved. The banner is hidden.",
    });
    router.refresh();
  }

  const waDigits = wa.replace(/[\s+()-]/g, "");
  const waOk = waDigits === "" || /^[0-9]{6,15}$/.test(waDigits);
  const mailOk = mail.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(mail.trim());
  const bizOk = biz.trim().length >= 2 && biz.trim().length <= 80;

  async function saveContact() {
    setCMsg(null);
    setBusy("contact");
    const err = await saveSettings({
      contact_business: biz.trim(),
      contact_whatsapp: waDigits,
      contact_email: mail.trim(),
      contact_hours: hours.trim(),
    });
    setBusy(null);
    if (err) return setCMsg({ ok: false, text: err });
    setWa(waDigits);
    setCMsg({ ok: true, text: "Saved. The Contact Us page and every WhatsApp button now use these details." });
    router.refresh();
  }

  return (
    <>
      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Site banner</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          A message shown at the top of every student page (lessons, classes, tools, profile, payment pages). Good for
          news, a class change or a payment reminder. Students can not close it, so switch it off when it is old.
        </p>
        <div className="mt-2">
          <Switch on={bOn} busy={busy === "banner"} label="Show the banner" onChange={setBOn} />
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_10rem]">
          <div>
            <label className={labelCls} htmlFor="b-text">Message ({bText.length}/200)</label>
            <input id="b-text" className={inputCls} value={bText} maxLength={200} onChange={(e) => setBText(e.target.value)} placeholder="Tonight's class starts at 8pm" />
          </div>
          <div>
            <label className={labelCls} htmlFor="b-tone">Colour</label>
            <select id="b-tone" className={inputCls} value={bTone} onChange={(e) => setBTone(e.target.value as BannerTone)}>
              <option value="info">Neutral</option>
              <option value="success">Green</option>
              <option value="warning">Red (important)</option>
            </select>
          </div>
        </div>
        {bText.trim() && (
          <p className={`mt-3 px-4 py-2 text-center text-xs font-bold ${TONE_PREVIEW[bTone]}`}>{bText.trim()}</p>
        )}
        <button onClick={saveBanner} disabled={busy === "banner"} className={`${saveBtn} mt-4`}>
          {busy === "banner" ? "Saving..." : "Save banner"}
        </button>
        {bMsg && <p className={`mt-3 text-sm ${bMsg.ok ? "text-accent" : "text-danger"}`}>{bMsg.text}</p>}
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Contact details</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Shown on the Contact Us page and the landing page, and used by every WhatsApp button on the site. Leave the
          WhatsApp number empty to keep using the one in the code.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="c-biz">Business name</label>
            <input id="c-biz" className={inputCls} value={biz} maxLength={80} onChange={(e) => setBiz(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-wa">WhatsApp number</label>
            <input id="c-wa" inputMode="tel" className={inputCls} value={wa} onChange={(e) => setWa(e.target.value)} placeholder="2207001234" />
            <p className="mt-1 text-[11px] text-muted">With the country code, no + sign. Gambia numbers start with 220.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="c-mail">Support email</label>
            <input id="c-mail" type="email" className={inputCls} value={mail} maxLength={120} onChange={(e) => setMail(e.target.value)} placeholder="support@yourdomain.com" />
          </div>
          <div>
            <label className={labelCls} htmlFor="c-hours">Opening hours (optional)</label>
            <input id="c-hours" className={inputCls} value={hours} maxLength={120} onChange={(e) => setHours(e.target.value)} placeholder="Mon to Sat, 9am to 6pm" />
          </div>
        </div>
        {!waOk && <p className="mt-3 text-xs text-danger">The WhatsApp number must be 6 to 15 digits.</p>}
        {!mailOk && <p className="mt-3 text-xs text-danger">That email address does not look right.</p>}
        {!bizOk && <p className="mt-3 text-xs text-danger">The business name must be 2 to 80 characters.</p>}
        <button onClick={saveContact} disabled={busy === "contact" || !waOk || !mailOk || !bizOk} className={`${saveBtn} mt-4`}>
          {busy === "contact" ? "Saving..." : "Save contact details"}
        </button>
        {cMsg && <p className={`mt-3 text-sm ${cMsg.ok ? "text-accent" : "text-danger"}`}>{cMsg.text}</p>}
      </div>
    </>
  );
}
