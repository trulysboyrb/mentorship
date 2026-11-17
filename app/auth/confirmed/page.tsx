import Link from "next/link";
import AuthCard from "@/components/AuthCard";

export default async function ConfirmedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  if (error) {
    return (
      <AuthCard title="Link problem" subtitle="This confirmation link did not work">
        <p className="text-center text-sm text-muted">
          The link may have expired or already been used. If you already confirmed your email, just sign in.
          If not, sign up again to get a fresh email.
        </p>
        <Link
          href="/login"
          className="mt-6 block rounded-control bg-white px-6 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase transition hover:bg-accent"
        >
          Go to sign in
        </Link>
        <Link href="/signup" className="mt-4 block text-center text-xs text-muted hover:text-white">
          Sign up again
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Email confirmed" subtitle="Your account is ready">
      <div className="flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent text-2xl text-accent">
          ✓
        </span>
      </div>
      <p className="mt-5 text-center text-sm text-muted">
        Your email has been confirmed. Proceed to sign in to complete your payment and unlock your courses.
      </p>
      <Link
        href="/login"
        className="mt-6 block rounded-control bg-accent px-6 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase"
      >
        Proceed to sign in
      </Link>
    </AuthCard>
  );
}
