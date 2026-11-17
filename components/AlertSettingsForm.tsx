"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputCls, labelCls } from "@/components/ui";
import { Switch, card, saveBtn, saveSettings, type Msg } from "@/components/SettingsBits";

export type AlertSettings = { payment: boolean; underpaid: boolean; payout: boolean; email: string };

// Settings: which events create an alert in the admin bell, and where the email copy goes.
export default function AlertSettingsForm({
  initial,
  emailReady,
}: {
  initial: AlertSettings;
  emailReady: boolean; // is RESEND_API_KEY set on the server?
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [email, setEmail] = useState(initial.email);
  const [vals, setVals] = useState(initial);

  async function flip(key: "payment" | "underpaid" | "payout", dbKey: string, next: boolean) {
    setMsg(null);
    setBusy(dbKey);
    const err = await saveSettings({ [dbKey]: next ? "1" : "0" });
    setBusy(null);
    if (err) return setMsg({ ok: false, text: err });
    setVals((v) => ({ ...v, [key]: next }));
    router.refresh();
  }

  const emailOk = email.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  async function saveEmail() {
    setMsg(null);
    setBusy("email");
    const err = await saveSettings({ alert_email: email.trim() });
    setBusy(null);
    if (err) return setMsg({ ok: false, text: err });
    setMsg({ ok: true, text: "Saved." });
    router.refresh();
  }

  return (
    <>
      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Alerts</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Alerts appear in the bell in the admin menu and on the Alerts page, live. Test (mock) payments never alert.
        </p>
        <div className="mt-2">
          <Switch on={vals.payment} busy={busy === "alert_payment_on"} label="New payment" desc="A student's payment was confirmed."
            onChange={(n) => flip("payment", "alert_payment_on", n)} />
          <Switch on={vals.underpaid} busy={busy === "alert_underpaid_on"} label="Underpaid crypto payment" desc="Someone sent less than the price. Needs your decision."
            onChange={(n) => flip("underpaid", "alert_underpaid_on", n)} />
          <Switch on={vals.payout} busy={busy === "alert_payout_on"} label="Payout request" desc="A student asked to cash out referral rewards."
            onChange={(n) => flip("payout", "alert_payout_on", n)} />
        </div>

        <div className="mt-4 border-t border-line pt-4">
          <label className={labelCls} htmlFor="a-email">Also email me about payments (optional)</label>
          <input id="a-email" type="email" className={inputCls} value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
          {!emailReady && (
            <p className="mt-2 text-xs text-muted">
              Email sending is not switched on yet. It needs a free Resend key (see PHASE18_SETUP.md). Until then you only get the in-app bell.
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Emails cover payments and underpaid payments. Payout requests show in the bell only. Automatic WhatsApp
            messages are not possible without a paid WhatsApp business service.
          </p>
          {!emailOk && <p className="mt-2 text-xs text-danger">That email address does not look right.</p>}
          <button onClick={saveEmail} disabled={busy === "email" || !emailOk || email.trim() === initial.email} className={`${saveBtn} mt-3`}>
            {busy === "email" ? "Saving..." : "Save email"}
          </button>
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-accent" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </>
  );
}
