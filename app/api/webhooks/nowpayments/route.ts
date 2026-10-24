import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyIpn } from "@/lib/payments/nowpayments";
import { handleNowPaymentsIpn } from "@/lib/payments/handlers";
import { supabasePaymentStore } from "@/lib/payments/store";

export const dynamic = "force-dynamic";

// NOWPayments calls this address whenever a crypto payment changes. We only believe the
// message if its signature matches our secret. Anything else is thrown away.
export async function POST(req: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const raw = await req.text();
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (!verifyIpn(body, req.headers.get("x-nowpayments-sig"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  try {
    const result = await handleNowPaymentsIpn(body, supabasePaymentStore(createAdminClient()));
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch {
    // 500 makes NOWPayments try again later.
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
