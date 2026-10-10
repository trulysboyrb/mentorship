"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { inputCls, labelCls, primaryBtn } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    whatsapp: "",
    country: "Gambia",
    learning_mode: "online",
    experience: "beginner",
    heard_from: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agreed) {
      setError("You must accept the terms and risk disclaimer.");
      return;
    }

    setLoading(true);
    const { email, password, ...meta } = form;
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: { data: meta },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns a user with no identities if the email already exists.
    if (data.user && data.user.identities?.length === 0) {
      setError("An account with this email already exists. Try logging in.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/pending");
      router.refresh();
    } else {
      // Email confirmation is switched on in Supabase.
      setCheckEmail(true);
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <AuthCard title="Check your email" subtitle="One more step">
        <p className="text-center text-sm text-muted">
          We sent a confirmation link to{" "}
          <span className="text-white">{form.email}</span>. Click it, then
          log in.
        </p>
        <Link
          href="/login"
          className="mt-6 block text-center text-xs text-accent hover:underline"
        >
          Go to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create Account" subtitle="Join the academy">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="full_name">Full name</label>
          <input id="full_name" required className={inputCls} placeholder="your full name"
            value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className={inputCls}
            placeholder="enter email" value={form.email}
            onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password</label>
          <input id="password" type="password" required autoComplete="new-password"
            className={inputCls} placeholder="at least 8 characters" value={form.password}
            onChange={(e) => set("password", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="whatsapp">WhatsApp number</label>
          <input id="whatsapp" type="tel" required className={inputCls}
            placeholder="include country code, e.g. 220..." value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="country">Country</label>
          <input id="country" required className={inputCls} value={form.country}
            onChange={(e) => set("country", e.target.value)} />
        </div>

        <fieldset>
          <legend className={labelCls}>How do you want to learn?</legend>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["online", "Online"],
              ["in_person", "In person"],
            ].map(([value, label]) => (
              <label key={value}
                className={`cursor-pointer rounded-control border px-4 py-3 text-center text-sm ${
                  form.learning_mode === value
                    ? "border-accent text-white"
                    : "border-line text-muted"
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
        <div>
          <label className={labelCls} htmlFor="heard_from">How did you hear about us?</label>
          <select id="heard_from" className={inputCls} value={form.heard_from}
            onChange={(e) => set("heard_from", e.target.value)}>
            <option value="">Select one (optional)</option>
            <option value="friend">A friend</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="other">Other</option>
          </select>
        </div>

        <label className="flex items-start gap-3 text-xs text-muted">
          <input type="checkbox" checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-[#1fd8a0]" />
          <span>
            I accept the{" "}
            <Link href="/terms" target="_blank" className="text-accent hover:underline">
              terms and risk disclaimer
            </Link>
            ,{" "}
            <Link href="/privacy" target="_blank" className="text-accent hover:underline">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link href="/refund" target="_blank" className="text-accent hover:underline">
              refund policy
            </Link>
            . I understand trading involves risk of loss and I am 18 or older.
          </span>
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">Login</Link>
      </p>
    </AuthCard>
  );
}
