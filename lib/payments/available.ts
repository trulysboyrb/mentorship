import type { SupabaseClient } from "@supabase/supabase-js";
import { availability, type Availability } from "@/lib/paymentConfig";
import type { PayMethod } from "@/lib/paymentMethods";
import type { SiteStatus } from "@/lib/siteSettings";

// Which pay buttons to show right now (a button is hidden when its keys are not set up).
export async function getAvailability(
  supabase: SupabaseClient,
  status?: Pick<SiteStatus, "pay_wave" | "pay_card" | "pay_crypto">
): Promise<Record<PayMethod, Availability>> {
  let rate: number | null = null;
  try {
    const { data } = await supabase.rpc("get_gmd_per_usd");
    rate = data === null || data === undefined ? null : Number(data);
  } catch {
    rate = null;
  }
  return availability(process.env, rate, status ? { wave: status.pay_wave, card: status.pay_card, crypto: status.pay_crypto } : undefined);
}
