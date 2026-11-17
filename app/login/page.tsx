"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthCard from "@/components/AuthCard";
import { inputCls, labelCls, primaryBtn } from "@/components/ui";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message.toLowerCase().includes("email not confirmed")
          ? "Please confirm your email first. Check your inbox."
          : "Wrong email or password."
      );
      setLoading(false);
      return;
    }

    // Admins go to the admin area, students to their dashboard.
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    router.push(profile?.role === "admin" ? "/admin" : "/dashboard");
    router.refresh();
  }

  return (
    <AuthCard title="Welcome Back" subtitle="Login to continue learning">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="enter email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            placeholder="enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-muted hover:text-accent">
            Forgot password?
          </Link>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}

        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <span className="anim-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black" aria-hidden />
              Logging in...
            </span>
          ) : (
            "Login"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
