import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice, currentDeviceToken } from "@/lib/device";
import TopBar from "@/components/TopBar";
import AvatarUploader from "@/components/AvatarUploader";
import { avatarUrl } from "@/lib/avatar";
import ProfileForm from "@/components/ProfileForm";
import LegalLinks from "@/components/LegalLinks";
import PdfPreview from "@/components/PdfPreview";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import DevicesPanel, { type DeviceItem } from "@/components/DevicesPanel";
import ReferralPanel from "@/components/ReferralPanel";
import NotesPanel, { type NoteItem } from "@/components/NotesPanel";
import type { Earnings, PayoutRow } from "@/lib/earnings";
import InstallApp from "@/components/InstallApp";
import { CONTACT_EMAIL } from "@/lib/legal";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, email, whatsapp, country, learning_mode, experience, payment_status, role, referral_code, referral_discount, avatar_path"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/dashboard");

  const isAdmin = profile.role === "admin";
  const cleared = profile.payment_status === "cleared";
  const limited = cleared && !isAdmin;

  if (limited && (await checkDevice(supabase)) === "limit") redirect("/device-limit");

  const token = await currentDeviceToken();

  const [
    { data: certRows },
    { data: deviceRows },
    { data: maxDevices },
    { data: stats },
    { data: earningsRaw },
    { data: payoutRows },
    { data: resourceRows },
  ] = await Promise.all([
      supabase
        .from("certificates")
        .select("id, title, file_path, issued_at")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false }),
      limited
        ? supabase.rpc("list_my_devices", { p_token: token ?? "" })
        : Promise.resolve({ data: [] as DeviceItem[] }),
      supabase.rpc("max_devices"),
      supabase.rpc("my_referral_stats"),
      supabase.rpc("my_earnings"),
      supabase
        .from("payout_requests")
        .select("id, amount, payout_info, status, admin_note, created_at, resolved_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("resources")
        .select("id, title, body, file_path, file_name, file_size, created_at, lessons(title)")
        .order("created_at", { ascending: false }),
    ]);

  // Notes and downloads uploaded by the admin (the database only returns what this student may see).
  const notes: NoteItem[] = await Promise.all(
    ((resourceRows ?? []) as unknown as {
      id: string;
      title: string;
      body: string | null;
      file_path: string | null;
      file_name: string | null;
      file_size: number | null;
      created_at: string;
      lessons: { title: string } | { title: string }[] | null;
    }[]).map(async (r) => {
      const lessonTitle = Array.isArray(r.lessons) ? r.lessons[0]?.title : r.lessons?.title;
      const url = r.file_path
        ? ((await supabase.storage
            .from("resources")
            .createSignedUrl(r.file_path, 3600, { download: r.file_name ?? true })).data?.signedUrl ?? null)
        : null;
      return {
        id: r.id,
        title: r.title,
        body: r.body,
        file_name: r.file_name,
        size: r.file_size,
        created_at: r.created_at,
        url,
        lesson_title: lessonTitle ?? null,
      };
    })
  );

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

  const refStats = Array.isArray(stats) ? stats[0] : stats;

  return (
    <>
      <TopBar
        fullName={profile.full_name}
        avatarUrl={avatarUrl(profile.avatar_path)}
        isAdmin={isAdmin}
        showTools={cleared || isAdmin}
        left={
          <Link href="/dashboard" className="text-muted hover:text-white">
            Back to courses
          </Link>
        }
      />

      <main className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-4xl font-black tracking-tight">Profile</h1>
        <p className="mt-3 text-sm text-muted">
          {profile.email} &middot;{" "}
          <span className={cleared ? "text-accent" : "text-danger"}>
            {cleared ? "Cleared" : "Payment pending"}
          </span>
        </p>

        <AvatarUploader userId={user.id} fullName={profile.full_name} currentPath={profile.avatar_path} />

        <RealtimeRefresh table="certificates" filter={`user_id=eq.${user.id}`} />
        <RealtimeRefresh table="resources" />
        <RealtimeRefresh table="payout_requests" filter={`user_id=eq.${user.id}`} />

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

        <NotesPanel items={notes} />

        <ReferralPanel
          code={profile.referral_code}
          active={cleared || isAdmin}
          total={refStats?.total ?? 0}
          paid={refStats?.paid ?? 0}
          usedCode={profile.referral_discount}
          earnings={(earningsRaw ?? null) as Earnings | null}
          payouts={(payoutRows ?? []) as PayoutRow[]}
        />

        {limited && (
          <DevicesPanel devices={(deviceRows ?? []) as DeviceItem[]} max={maxDevices ?? 2} />
        )}

        <InstallApp />

        <div className="mt-10">
          <ProfileForm profile={profile} />
        </div>

        <p className="mt-10 text-xs text-muted">
          To change your email or delete your account, contact {CONTACT_EMAIL}.
        </p>
        <LegalLinks className="mt-8 !justify-start" />
      </main>
    </>
  );
}
