"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatGMD, priceFor } from "@/lib/pricing";
import type { SiteStatus } from "@/lib/siteSettings";
import { inputCls, labelCls } from "@/components/ui";
import { Switch, card, saveBtn, type Msg } from "@/components/SettingsBits";

type Keys = Record<"wave" | "card" | "crypto", { ok: boolean; reason?: string }>;

export default function SiteSettingsForm({ status, keys }: { status: SiteStatus; keys: Keys }) {
  const router = useRouter();
  const [online, setOnline] = useState(String(status.price_online));
  const [inPerson, setInPerson] = useState(String(status.price_in_person));
  const [group, setGroup] = useState(String(status.price_group));
  const [percent, setPercent] = useState(String(status.referral_percent));
  const [batch, setBatch] = useState(String(status.current_batch));
  const [groupMax, setGroupMax] = useState(String(status.group_max));
  const [batchMsg, setBatchMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [priceMsg, setPriceMsg] = useState<Msg>(null);
  const [switchMsg, setSwitchMsg] = useState<Msg>(null);

  async function save(patch: Record<string, string>): Promise<string | null> {
    const { error } = await createClient().rpc("admin_save_site_settings", { p: patch });
    return error ? error.message : null;
  }

  const on = Number(online);
  const ip = Number(inPerson);
  const gp = Number(group);
  const pc = Number(percent);
  const pricesValid =
    Number.isInteger(on) && on >= 1 && on <= 1_000_000 &&
    Number.isInteger(ip) && ip >= 1 && ip <= 1_000_000 &&
    Number.isInteger(gp) && gp >= 1 && gp <= 1_000_000 &&
    Number.isInteger(pc) && pc >= 0 && pc <= 50;
  const unchanged =
    on === status.price_online && ip === status.price_in_person && gp === status.price_group && pc === status.referral_percent;

  async function savePrices() {
    setPriceMsg(null);
    setBusy("prices");
    const err = await save({
      price_online: String(on),
      price_in_person: String(ip),
      price_group: String(gp),
      referral_percent: String(pc),
    });
    setBusy(null);
    if (err) return setPriceMsg({ ok: false, text: err });
    setPriceMsg({ ok: true, text: "Saved. New payments use these prices right away." });
    router.refresh();
  }

  const bn = Number(batch);
  const gm = Number(groupMax);
  const batchValid = Number.isInteger(bn) && bn >= 1 && bn <= 9999 && Number.isInteger(gm) && gm >= 2 && gm <= 50;
  const batchUnchanged = bn === status.current_batch && gm === status.group_max;

  async function saveBatch() {
    setBatchMsg(null);
    setBusy("batch");
    const err = await save({ current_batch: String(bn), group_size_max: String(gm) });
    setBusy(null);
    if (err) return setBatchMsg({ ok: false, text: err });
    setBatchMsg({ ok: true, text: `Saved. New in person sign ups go into Batch ${bn}.` });
    router.refresh();
  }

  async function flip(key: string, next: boolean, confirmText?: string) {
    if (confirmText && next && !window.confirm(confirmText)) return;
    setSwitchMsg(null);
    setBusy(key);
    const err = await save({ [key]: next ? "1" : "0" });
    setBusy(null);
    if (err) return setSwitchMsg({ ok: false, text: err });
    router.refresh();
  }

  const preview = pricesValid
    ? {
        online: priceFor("online", true, { online: on, in_person: ip, group: gp, referralPercent: pc }),
        inPerson: priceFor("in_person", true, { online: on, in_person: ip, group: gp, referralPercent: pc }),
        group: priceFor("group", true, { online: on, in_person: ip, group: gp, referralPercent: pc }),
      }
    : null;

  return (
    <>
      <h3 className="mt-8 text-xs font-extrabold tracking-widest uppercase">Prices and referral discount</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          The price students pay, in dalasi. Everything on the site updates at once: landing page, dashboard, payment
          pages and WhatsApp messages. A payment that a student already started keeps the price it was created with.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="p-online">Online price (D)</label>
            <input id="p-online" inputMode="numeric" className={inputCls} value={online} onChange={(e) => setOnline(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-inperson">In person price (D)</label>
            <input id="p-inperson" inputMode="numeric" className={inputCls} value={inPerson} onChange={(e) => setInPerson(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-group">In person group price (D, whole group)</label>
            <input id="p-group" inputMode="numeric" className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-ref">Referral discount (%)</label>
            <input id="p-ref" inputMode="numeric" className={inputCls} value={percent} onChange={(e) => setPercent(e.target.value)} />
          </div>
        </div>
        {preview && (
          <p className="mt-3 text-xs text-muted">
            With a referral code a student would pay {formatGMD(preview.online.final)} online or{" "}
            {formatGMD(preview.inPerson.final)} in person, or {formatGMD(preview.group.final)} for a whole in person group.
          </p>
        )}
        {!pricesValid && (
          <p className="mt-3 text-xs text-danger">
            Prices must be whole numbers from 1 to 1,000,000 and the discount a whole number from 0 to 50.
          </p>
        )}
        <button onClick={savePrices} disabled={busy === "prices" || !pricesValid || unchanged} className={`${saveBtn} mt-4`}>
          {busy === "prices" ? "Saving..." : "Save prices"}
        </button>
        {priceMsg && <p className={`mt-3 text-sm ${priceMsg.ok ? "text-accent" : "text-danger"}`}>{priceMsg.text}</p>}
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">In person batch and groups</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Every new in person sign up (single or group) is put in the batch number below automatically. When a new batch
          starts, change the number here: people who already signed up keep their old batch.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="p-batch">Current batch number</label>
            <input id="p-batch" inputMode="numeric" className={inputCls} value={batch} onChange={(e) => setBatch(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} htmlFor="p-gmax">Most people in one group</label>
            <input id="p-gmax" inputMode="numeric" className={inputCls} value={groupMax} onChange={(e) => setGroupMax(e.target.value)} />
          </div>
        </div>
        {!batchValid && (
          <p className="mt-3 text-xs text-danger">The batch must be a whole number from 1 to 9999 and a group from 2 to 50 people.</p>
        )}
        <button onClick={saveBatch} disabled={busy === "batch" || !batchValid || batchUnchanged} className={`${saveBtn} mt-4`}>
          {busy === "batch" ? "Saving..." : "Save batch and group size"}
        </button>
        {batchMsg && <p className={`mt-3 text-sm ${batchMsg.ok ? "text-accent" : "text-danger"}`}>{batchMsg.text}</p>}
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Payment buttons</h3>
      <div className={card}>
        <p className="text-sm text-muted">
          Switch a payment method off if its provider has trouble. Students stop seeing the button and the server also
          refuses it. Payments already made still clear automatically. Changes take effect immediately.
        </p>
        <div className="mt-2">
          {(
            [
              ["pay_wave_on", "Wave", status.pay_wave, keys.wave],
              ["pay_card_on", "Card", status.pay_card, keys.card],
              ["pay_crypto_on", "Crypto", status.pay_crypto, keys.crypto],
            ] as const
          ).map(([k, label, isOn, key]) => (
            <Switch
              key={k}
              on={isOn}
              busy={busy === k}
              label={`Pay via ${label}`}
              desc="Automatic clearance once the payment is verified."
              warn={key.ok ? undefined : `Not set up yet: ${key.reason ?? "keys missing"}. The button stays hidden either way.`}
              onChange={(next) => flip(k, next)}
            />
          ))}
          <Switch
            on={status.pay_whatsapp}
            busy={busy === "pay_whatsapp_on"}
            label="Pay via WhatsApp"
            desc="Students message you and you clear them by hand."
            onChange={(next) => flip("pay_whatsapp_on", next)}
          />
        </div>
        {switchMsg && <p className={`mt-3 text-sm ${switchMsg.ok ? "text-accent" : "text-danger"}`}>{switchMsg.text}</p>}
      </div>

      <h3 className="mt-10 text-xs font-extrabold tracking-widest uppercase">Signups and maintenance</h3>
      <div className={card}>
        <Switch
          on={status.signups_open}
          busy={busy === "signups_open"}
          label="Signups open"
          desc="When off, the sign up page says registration is closed and the database refuses new accounts. Existing students can still log in."
          onChange={(next) => flip("signups_open", next)}
        />
        <Switch
          on={status.maintenance}
          busy={busy === "maintenance_on"}
          label="Maintenance mode"
          desc={'Students see their pages blurred with "We\'re Currently On Maintenance, Come Back Soon". You (admin), login, signup and the legal pages are not blocked.'}
          warn={status.maintenance ? "Maintenance mode is ON right now." : undefined}
          onChange={(next) => flip("maintenance_on", next, "Turn ON maintenance mode? Students will immediately see the maintenance page.")}
        />
        <p className="mt-3 text-xs text-muted">
          Maintenance covers the student pages on screen. It does not lock the database, and payments that are already
          in progress still clear.
        </p>
      </div>
    </>
  );
}
