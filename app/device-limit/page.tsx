import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkDevice, currentDeviceToken } from "@/lib/device";
import { BRAND } from "@/lib/config";
import { whatsappHelpLink } from "@/lib/whatsapp";
import { getSiteStatus } from "@/lib/siteStatus";
import AuthCard from "@/components/AuthCard";
import SignOutButton from "@/components/SignOutButton";

export default async function DeviceLimitPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, payment_status, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin" || profile?.payment_status !== "cleared") redirect("/dashboard");

  // If this device is allowed (for example after a reset), go straight in.
  if ((await checkDevice(supabase)) === "ok") redirect("/dashboard");

  const token = await currentDeviceToken();
  const [{ data: devices }, { data: max }] = await Promise.all([
    supabase.rpc("list_my_devices", { p_token: token ?? "" }),
    supabase.rpc("max_devices"),
  ]);

  const site = await getSiteStatus();
  const help = whatsappHelpLink(
    `Hi, I can't open my courses on a new device on ${BRAND}. My account is ${user.email}. Please reset my devices.`,
    site.contact_whatsapp
  );

  return (
    <AuthCard
      title="Device limit reached"
      subtitle={`Each account works on up to ${max ?? 2} devices`}
    >
      <p className="text-center text-sm text-muted">
        Your account is already in use on the maximum number of devices, so this one
        cannot open the courses.
      </p>

      {(devices ?? []).length > 0 && (
        <ul className="mt-6 space-y-2">
          {(devices ?? []).map((d: { id: string; label: string; last_seen: string }) => (
            <li
              key={d.id}
              className="flex items-center justify-between border border-line bg-black px-4 py-3 text-sm"
            >
              <span>{d.label}</span>
              <span className="text-[11px] text-muted" suppressHydrationWarning>
                last used{" "}
                {new Date(d.last_seen).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 space-y-3 text-sm text-muted">
        <p>
          <span className="text-white">Changed phone or computer?</span> Message us and we
          will reset your devices.
        </p>
        <p>
          Or log in on one of the devices above, open Profile, and remove the one you no
          longer use.
        </p>
      </div>

      <a
        href={help}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 block rounded-control bg-accent px-6 py-3.5 text-center text-xs font-extrabold tracking-wider text-black uppercase"
      >
        Ask us to reset on WhatsApp
      </a>

      <div className="mt-5 flex items-center justify-between">
        <a href="/dashboard" className="text-xs text-muted hover:text-white">
          Try again
        </a>
        <SignOutButton />
      </div>
    </AuthCard>
  );
}
