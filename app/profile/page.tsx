import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import ProfileForm from "@/components/ProfileForm";
import LegalLinks from "@/components/LegalLinks";
import { CONTACT_EMAIL } from "@/lib/legal";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, whatsapp, country, learning_mode, experience, payment_status")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const cleared = profile.payment_status === "cleared";

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-xs text-muted hover:text-white">
          Back to courses
        </Link>
        <SignOutButton />
      </div>

      <h1 className="mt-10 text-4xl font-black tracking-tight">Profile</h1>
      <p className="mt-3 text-sm text-muted">
        {profile.email} &middot;{" "}
        <span className={cleared ? "text-accent" : "text-danger"}>
          {cleared ? "Cleared" : "Payment pending"}
        </span>
      </p>

      <div className="mt-8">
        <ProfileForm profile={profile} />
      </div>

      <p className="mt-10 text-xs text-muted">
        To change your email or delete your account, contact {CONTACT_EMAIL}.
      </p>
      <LegalLinks className="mt-8 !justify-start" />
    </main>
  );
}
