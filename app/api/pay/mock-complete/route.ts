import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockEnabled } from "@/lib/paymentConfig";
import { supabasePaymentStore } from "@/lib/payments/store";

export const dynamic = "force-dynamic";

// TESTING ONLY. Pretends the payment company said "paid". Works only when
// PAYMENTS_MOCK=1 and the site is NOT in production, and only for your own payment.
export async function POST(req: Request) {
  if (!mockEnabled(process.env)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { payment?: string; result?: string } | null;
  if (!body?.payment) return NextResponse.json({ error: "Missing payment." }, { status: 400 });

  const { data: own } = await supabase.from("payments").select("id").eq("id", body.payment).maybeSingle();
  if (!own) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  const store = supabasePaymentStore(createAdminClient());
  const outcome =
    body.result === "fail"
      ? await store.markStatus(body.payment, "failed", "Test payment failed")
      : await store.markPaid(body.payment, `mock_${Date.now()}`, null);
  await store.logEvent({ provider: "mock", eventType: body.result ?? "paid", paymentId: body.payment, handled: true, outcome, payload: body });
  return NextResponse.json({ outcome });
}
