import { NextResponse } from "next/server";
import ModemPay from "modem-pay";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleModemPayEvent } from "@/lib/payments/handlers";
import { supabasePaymentStore } from "@/lib/payments/store";

export const dynamic = "force-dynamic";

// Modem Pay calls this address when a Wave or card payment changes. The Modem Pay
// package checks the signature for us; if it does not match, the message is thrown away.
export async function POST(req: Request) {
  const key = process.env.MODEMPAY_SECRET_KEY;
  const secret = process.env.MODEMPAY_WEBHOOK_SECRET;
  if (!key || !secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-modem-signature") ?? "";

  let event: { event: string; payload: Record<string, any> | null };
  try {
    event = new ModemPay(key).webhooks.composeEventDetails(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  try {
    const result = await handleModemPayEvent(event, supabasePaymentStore(createAdminClient()));
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch {
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
