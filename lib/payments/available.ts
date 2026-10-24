import type { SupabaseClient } from "@supabase/supabase-js";
import { availability, type Availability } from "@/lib/paymentConfig";
import type { PayMethod } from "@/lib/paymentMethods";

// Which pay buttons to show right now (a button is hidden when its keys are not set up).
export async function getAvailability(supabase: SupabaseClient): Promise<Record<PayMethod, Availability>> {
  let rate: number | null = null;
  try {
    const { data } = await supabase.rpc("get_gmd_per_usd");
    rate = data === null || data === undefined ? null : Number(data);
  } catch {
    rate = null;
  }
  return availability(process.env, rate);
}
