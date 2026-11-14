"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { inputCls, labelCls, primaryBtn } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";
import { passwordStrength, validEmail } from "@/lib/passwordStrength";
import { priceFor } from "@/lib/pricing";
import { priceText, isCurrency, type CurrencyCode, type MoneyCtx } from "@/lib/currency";
import { DEFAULT_STATUS, parseSiteStatus, pricingOf, type SiteStatus } from "@/lib/siteSettings";
import { normalizeReferralCode } from "@/lib/referral";

type CodeState = "idle" | "checking" | "valid" | "invalid";

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
    referral: "",
  });
  const [step, setStep] = useState<1 | 2>(1);
  const [site, setSite] = useState<SiteStatus>(DEFAULT_STATUS);
  const [siteChecked, setSiteChecked] = useState(false);
  // The visitor's currency, worked out on the server from their country.
  const [cur, setCur] = useState<{ code: CurrencyCode; fx: number | null } | null>(null);
  const [codeState, setCodeState] = useState<CodeState>("idle");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function checkCode(raw: string): Promise<CodeState> {
    const code = normalizeReferralCode(raw);
    if (!code) {
      setCodeState("idle");
      return "idle";
    }
    setCodeState("checking");
    const { data, error } = await createClient().rpc("check_referral_code", { p_code: code });
    const next: CodeState = !error && data === true ? "valid" : "invalid";
    setCodeState(next);
    return next;
  }

  // The admin can close signups and change prices, so ask the database what is true right now.
  useEffect(() => {
    let alive = true;
    createClient()
      .rpc("site_status")
      .then(({ data }) => {
        if (!alive) return;
        setSite(parseSiteStatus(data));
        setSiteChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/currency", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive) return;
        setCur(j && isCurrency(j.code) ? { code: j.code, fx: typeof j.fx === "number" ? j.fx : null } : { code: "GMD", fx: null });
      })
      .catch(() => alive && setCur({ code: "GMD", fx: null }));
    return () => {
      alive = false;
    };
  }, []);
  const money: MoneyCtx = {
    code: cur?.code ?? "GMD",
    fx: cur?.fx ?? null,
    gmdPerUsd: site.gmd_per_usd,
    enabled: site.local_prices_on,
  };

  // A friend's share link looks like /signup?ref=K7M2QX
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      const code = normalizeReferralCode(ref).slice(0, 12);
      setForm((f) => ({ ...f, referral: code }));
      checkCode(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goNext(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.full_name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!validEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setStep(1);
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!agreed) {
      setError("You must accept the terms and risk disclaimer.");
      return;
    }

    setLoading(true);

    if (normalizeReferralCode(form.referral)) {
      const state = codeState === "valid" ? "valid" : await checkCode(form.referral);
      if (state !== "valid") {
        setError("That referral code is not valid. Check it, or clear the box to continue without one.");
        setLoading(false);
        return;
      }
    }

    const { email, password, referral, ...meta } = form;
    const { data, error } = await createClient().auth.signUp({
      email,
      password,
      options: {
        data: { ...meta, referral_code: normalizeReferralCode(referral) },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/confirmed`,
      },
    });

    if (error) {
      // When signups are closed the database refuses the new account.
      const { data: fresh } = await createClient().rpc("site_status");
      if (!parseSiteStatus(fresh).signups_open) {
        setSite(parseSiteStatus(fresh));
        setLoading(false);
        return;
      }
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns a user with no identities if the email already exists.
    if (data.user && data.user.identities?.length === 0) {
      setStep(1);
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

  if (siteChecked && !site.signups_open) {
    return (
      <AuthCard title="Signups are closed" subtitle="We are not taking new students right now">
        <p className="text-center text-sm text-muted">
          Registration is closed for the moment. Please check back soon. If you already have an account you can still log in.
        </p>
        <Link href="/login" className={`${primaryBtn} mt-6 block text-center`}>
          Login
        </Link>
        <Link href="/" className="mt-4 block text-center text-xs text-accent hover:underline">
          Back to home
        </Link>
      </AuthCard>
    );
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

  const referred = codeState === "valid";
  const strength = passwordStrength(form.password);

  return (
    <AuthCard title="Create Account" subtitle="Join the academy">
      <ol className="mb-8 grid grid-cols-2 gap-3" aria-label="Sign up progress">
        {["Account", "Your details"].map((label, i) => (
          <li key={label}>
            <div className={`h-1 transition-colors duration-500 ${step >= i + 1 ? "bg-accent" : "bg-line"}`} />
            <p className={`mt-2 text-[10px] font-extrabold tracking-widest uppercase ${step === i + 1 ? "text-white" : "text-muted"}`}>
              {i + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <form onSubmit={goNext} className="space-y-5" key="step1">
          <div className="anim-fade-up">
            <label className={labelCls} htmlFor="full_name">Full name</label>
            <input id="full_name" required autoComplete="name" className={inputCls} placeholder="your full name"
              value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="anim-fade-up" style={{ "--d": "0.06s" } as React.CSSProperties}>
            <label className={labelCls} htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className={inputCls}
              placeholder="enter email" value={form.email}
              onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="anim-fade-up" style={{ "--d": "0.12s" } as React.CSSProperties}>
            <label className={labelCls} htmlFor="password">Password</label>
            <PasswordInput id="password" required autoComplete="new-password"
              placeholder="at least 8 characters" value={form.password}
              onChange={(e) => set("password", e.target.value)} />
            {form.password && (
              <div className="mt-2" aria-live="polite">
                <div className="grid grid-cols-4 gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className={`h-1 transition-colors ${
                      strength.score >= n ? (strength.score <= 1 ? "bg-danger" : "bg-accent") : "bg-line"
                    }`} />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-muted">{strength.label}</p>
              </div>
            )}
          </div>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <button type="submit" className={primaryBtn}>Continue</button>
        </form>
      ) : (
      <form onSubmit={onSubmit} className="space-y-5" key="step2">
        <div className="anim-fade-up">
          <label className={labelCls} htmlFor="whatsapp">WhatsApp number</label>
          <input id="whatsapp" type="tel" required className={inputCls}
            placeholder="include country code, e.g. 220..." value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)} />
        </div>
        <div className="anim-fade-up" style={{ "--d": "0.06s" } as React.CSSProperties}>
          <label className={labelCls} htmlFor="country">Country</label>
          <input id="country" required className={inputCls} value={form.country}
            onChange={(e) => set("country", e.target.value)} />
        </div>

        <fieldset>
          <legend className={labelCls}>How do you want to learn?</legend>
          <div className="grid grid-cols-2 gap-3">
            {(["online", "in_person"] as const).map((value) => {
              const label = value === "online" ? "Online" : "In person";
              const { base, final } = priceFor(value, referred, pricingOf(site));
              return (
                <label key={value}
                  className={`cursor-pointer rounded-control border px-4 py-3 text-center ${
                    form.learning_mode === value
                      ? "border-accent text-white"
                      : "border-line text-muted"
                  }`}>
                  <input type="radio" name="learning_mode" value={value} className="sr-only"
                    checked={form.learning_mode === value}
                    onChange={() => set("learning_mode", value)} />
                  <span className="block text-sm">{label}</span>
                  <span className="mt-1 block text-[11px] text-muted/75">
                    {!cur || !siteChecked ? (
                      "\u00a0"
                    ) : referred ? (
                      <>
                        <s>{priceText(base, money).text}</s> {priceText(final, money).text}
                      </>
                    ) : (
                      priceText(base, money).text
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className={labelCls} htmlFor="experience">Experience</label>
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

        <div>
          <label className={labelCls} htmlFor="referral">Referral code (optional)</label>
          <input id="referral" maxLength={14} autoComplete="off" className={inputCls}
            placeholder={`from a friend, for ${site.referral_percent}% off`} value={form.referral}
            onChange={(e) => {
              set("referral", e.target.value.toUpperCase());
              setCodeState("idle");
            }}
            onBlur={(e) => checkCode(e.target.value)} />
          <p className="mt-2 min-h-4 text-xs" aria-live="polite">
            {codeState === "checking" && <span className="text-muted">Checking code...</span>}
            {codeState === "valid" && (
              <span className="text-accent">
                Code accepted. You get {site.referral_percent}% off.
              </span>
            )}
            {codeState === "invalid" && (
              <span className="text-danger">This code is not valid.</span>
            )}
          </p>
        </div>

        <label className="flex items-start gap-3 text-xs text-muted">
          <input type="checkbox" checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 accent-[#6c579e]" />
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
            . I am 18 or older.
          </span>
        </label>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          <button type="button" onClick={() => { setError(""); setStep(1); }}
            className="rounded-control border border-line px-4 py-3.5 text-xs font-extrabold tracking-wider uppercase hover:border-accent">
            Back
          </button>
          <button type="submit" disabled={loading} className={`${primaryBtn} col-span-2`}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="anim-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black" aria-hidden />
                Creating account...
              </span>
            ) : (
              "Create account"
            )}
          </button>
        </div>
      </form>
      )}

      <p className="mt-6 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent hover:underline">Login</Link>
      </p>
    </AuthCard>
  );
}
