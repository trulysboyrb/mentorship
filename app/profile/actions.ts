"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentDeviceToken } from "@/lib/device";

// Runs on the server because the current device's ID is a private (HttpOnly) cookie.
export async function removeDevice(deviceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const token = await currentDeviceToken();

  const { error } = await supabase.rpc("remove_my_device", {
    p_id: deviceId,
    p_token: token ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return {};
}
