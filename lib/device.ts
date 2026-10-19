import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { describeDevice } from "@/lib/deviceLabel";
import { DEVICE_COOKIE, isValidDeviceToken } from "@/lib/deviceCookie";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function currentDeviceToken(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return isValidDeviceToken(value) ? value : null;
}

// Registers this browser as one of the student's devices.
// Returns "limit" only when the account is already used on the maximum number of devices.
// If anything goes wrong on our side we let the student in rather than lock them out.
export async function checkDevice(supabase: Client): Promise<"ok" | "limit"> {
  const token = await currentDeviceToken();
  if (!token) return "ok";

  const userAgent = (await headers()).get("user-agent") ?? "";
  const { data, error } = await supabase.rpc("register_device", {
    p_token: token,
    p_label: describeDevice(userAgent),
  });

  if (error) return "ok";
  return data === "limit" ? "limit" : "ok";
}
