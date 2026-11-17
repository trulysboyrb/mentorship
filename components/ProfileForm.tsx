"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, labelCls } from "@/components/ui";

type Profile = {
  full_name: string;
  whatsapp: string | null;
  country: string | null;
  learning_mode: string | null;
  experience: string | null;
};

const saveBtn =
  "rounded-control bg-white px-8 py-3 text-xs font-extrabold tracking-wider text-black uppercase transition hover:bg-accent disabled:opacity-50";

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    full_name: profile.full_name,
    whatsapp: profile.whatsapp ?? "",
    country: profile.country ?? "",
    learning_mode: profile.learning_mode ?? "online",
    experience: profile.experience ?? "beginner",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc("update_my_profile", {
      p_full_name: form.full_name,
      p_whatsapp: form.whatsapp,
      p_country: form.country,
      p_learning_mode: form.learning_mode,
      p_experience: form.experience,
    });
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Saved." });
    if (!error) router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw.password.length < 8)
      return setPwMsg({ ok: false, text: "Password must be at least 8 characters." });
    if (pw.password !== pw.confirm)
      return setPwMsg({ ok: false, text: "The two passwords do not match." });

    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.password });
    setPwSaving(false);
    if (error) return setPwMsg({ ok: false, text: error.message });
    setPw({ password: "", confirm: "" });
    setPwMsg({ ok: true, text: "Password changed." });
  }

  const note = (m: { ok: boolean; text: string } | null) =>
    m && <p className={`text-sm ${m.ok ? "text-accent" : "text-danger"}`}>{m.text}</p>;

  return (
    <div className="space-y-10">
      <form onSubmit={saveProfile} className="space-y-5 rounded-card border border-line bg-surface p-6">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Your details</h3>

        <div>
          <label className={labelCls} htmlFor="full_name">Full name</label>
          <input id="full_name" required className={inputCls} value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="whatsapp">WhatsApp number</label>
          <input id="whatsapp" type="tel" className={inputCls} value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="country">Country</label>
          <input id="country" className={inputCls} value={form.country}
            onChange={(e) => set("country", e.target.value)} />
        </div>

        <fieldset>
          <legend className={labelCls}>How you learn</legend>
          <div className="grid grid-cols-2 gap-3">
            {[["online", "Online"], ["in_person", "In person"]].map(([value, label]) => (
              <label key={value}
                className={`cursor-pointer rounded-control border px-4 py-3 text-center text-sm ${
                  form.learning_mode === value ? "border-accent text-white" : "border-line text-muted"
                }`}>
                <input type="radio" name="learning_mode" value={value} className="sr-only"
                  checked={form.learning_mode === value}
                  onChange={() => set("learning_mode", value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className={labelCls} htmlFor="experience">Trading experience</label>
          <select id="experience" className={inputCls} value={form.experience}
            onChange={(e) => set("experience", e.target.value)}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="experienced">Experienced</option>
          </select>
        </div>

        {note(msg)}
        <button type="submit" disabled={saving} className={saveBtn}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-5 rounded-card border border-line bg-surface p-6">
        <h3 className="text-xs font-extrabold tracking-widest uppercase">Change password</h3>
        <div>
          <label className={labelCls} htmlFor="new_password">New password</label>
          <input id="new_password" type="password" autoComplete="new-password" className={inputCls}
            placeholder="at least 8 characters" value={pw.password}
            onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))} />
        </div>
        <div>
          <label className={labelCls} htmlFor="confirm_password">Confirm password</label>
          <input id="confirm_password" type="password" autoComplete="new-password" className={inputCls}
            value={pw.confirm}
            onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} />
        </div>
        {note(pwMsg)}
        <button type="submit" disabled={pwSaving} className={saveBtn}>
          {pwSaving ? "Saving..." : "Change password"}
        </button>
      </form>
    </div>
  );
}
