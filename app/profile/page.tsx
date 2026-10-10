import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import ProfileForm from "@/components/ProfileForm";
import LegalLinks from "@/components/LegalLinks";
import PdfPreview from "@/components/PdfPreview";
import RealtimeRefresh from "@/components/RealtimeRefresh";
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

  const { data: certRows } = await supabase
    .from("certificates")
    .select("id, title, file_path, issued_at")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });

  const certs = await Promise.all(
    (certRows ?? []).map(async (c) => {
      const fileName = `${c.title.replace(/[^\w\s-]/g, "").trim() || "Certificate"}.pdf`;
      const [view, dl] = await Promise.all([
        supabase.storage.from("certificates").createSignedUrl(c.file_path, 3600),
        supabase.storage
          .from("certificates")
          .createSignedUrl(c.file_path, 3600, { download: fileName }),
      ]);
      return {
        ...c,
        viewUrl: view.data?.signedUrl ?? null,
        downloadUrl: dl.data?.signedUrl ?? null,
      };
    })
  );

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

      <RealtimeRefresh table="certificates" filter={`user_id=eq.${user.id}`} />

      <section className="mt-10">
        <h2 className="text-xs font-extrabold tracking-widest uppercase">Certificates</h2>
        {certs.length === 0 ? (
          <p className="mt-4 rounded-card border border-line bg-surface p-6 text-sm text-muted">
            No Certificates
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            {certs.map((c) => (
              <div key={c.id} className="rounded-card border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{c.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      Issued{" "}
                      {new Date(c.issued_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  {c.downloadUrl && (
                    <a
                      href={c.downloadUrl}
                      className="rounded-control bg-accent px-5 py-2.5 text-xs font-extrabold tracking-wider text-black uppercase"
                    >
                      Download Certificate
                    </a>
                  )}
                </div>
                {c.viewUrl && <PdfPreview src={c.viewUrl} />}
              </div>
            ))}
          </div>
        )}
      </section>

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
