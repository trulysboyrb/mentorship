"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { inputCls, labelCls, primaryBtn } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle="Reset link sent">
        <p className="text-center text-sm text-muted">
          If an account exists for <span className="text-white">{email}</span>,
          we sent a link to reset the password. Open it in this same browser.
        </p>
        <Link href="/login" className="mt-6 block text-center text-xs text-accent hover:underline">
          Back to login
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset Password" subtitle="We will email you a reset link">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className={inputCls}
            placeholder="enter email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-accent hover:underline">Login</Link>
      </p>
    </AuthCard>
  );
}
