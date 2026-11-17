"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { labelCls, primaryBtn } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ready" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setStatus(data.user ? "ready" : "expired"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("The two passwords do not match.");

    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (status === "checking") {
    return <AuthCard title="Reset Password" subtitle="One moment..."><div /></AuthCard>;
  }

  if (status === "expired") {
    return (
      <AuthCard title="Link expired" subtitle="This reset link is no longer valid">
        <p className="text-center text-sm text-muted">
          Reset links work once, and only in the browser where you asked for
          them. Request a new one to continue.
        </p>
        <Link href="/forgot-password"
          className="mt-6 block rounded-control bg-white px-6 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="New Password" subtitle="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="password">New password</label>
          <PasswordInput id="password" required autoComplete="new-password"
            placeholder="at least 8 characters" value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="confirm">Confirm password</label>
          <PasswordInput id="confirm" required autoComplete="new-password"
            placeholder="repeat the password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? "Saving..." : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}
