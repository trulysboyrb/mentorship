import { mapNowStatus } from "./nowpayments";
import { extractAmount, extractOrderId, extractRefs } from "./modempay";

// The rules for what to do with a payment message. The database is reached through
// "PaymentStore", so these rules can be tested without a real database.

export interface PaymentStore {
  markPaid(paymentId: string, ref: string | null, paidGmd: number | null): Promise<string>;
  markStatus(paymentId: string, status: "failed" | "expired" | "cancelled" | "underpaid", note: string): Promise<string>;
  findByRef(provider: string, ref: string): Promise<string | null>;
  logEvent(e: {
    provider: string;
    eventType: string | null;
    paymentId: string | null;
    handled: boolean;
    outcome: string;
    payload: unknown;
  }): Promise<void>;
}

export type HandlerResult = { status: number; outcome: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- NOWPayments (crypto). Signature must already be verified. ----------
export async function handleNowPaymentsIpn(body: Record<string, any>, store: PaymentStore): Promise<HandlerResult> {
  const orderId = typeof body.order_id === "string" && UUID.test(body.order_id) ? body.order_id : null;
  const eventType = typeof body.payment_status === "string" ? body.payment_status : null;

  if (!orderId) {
    await store.logEvent({ provider: "nowpayments", eventType, paymentId: null, handled: false, outcome: "no_order_id", payload: body });
    return { status: 200, outcome: "no_order_id" };
  }

  const action = mapNowStatus(body.payment_status);
  let outcome: string;

  if (action.kind === "paid") {
    outcome = await store.markPaid(orderId, body.payment_id != null ? String(body.payment_id) : null, null);
  } else if (action.kind === "status") {
    outcome = await store.markStatus(orderId, action.status, action.note);
  } else {
    outcome = "waiting";
  }

  const matched = outcome !== "not_found";
  await store.logEvent({
    provider: "nowpayments",
    eventType,
    paymentId: matched ? orderId : null,
    handled: matched && outcome !== "waiting",
    outcome,
    payload: body,
  });
  return { status: 200, outcome };
}

// ---------- Modem Pay (Wave and card). Signature must already be verified. ----------
export async function handleModemPayEvent(
  event: { event?: string; payload?: Record<string, any> | null },
  store: PaymentStore
): Promise<HandlerResult> {
  const type = event.event ?? null;
  const payload = event.payload ?? null;

  if (type !== "charge.succeeded" && type !== "charge.failed" && type !== "payment_intent.cancelled") {
    await store.logEvent({ provider: "modempay", eventType: type, paymentId: null, handled: false, outcome: "ignored", payload: event });
    return { status: 200, outcome: "ignored" };
  }

  // Find our payment: first by the order id we attached, then by the provider's reference.
  let paymentId = extractOrderId(payload);
  if (!paymentId) {
    for (const ref of extractRefs(payload)) {
      paymentId = await store.findByRef("modempay", ref);
      if (paymentId) break;
    }
  }

  if (!paymentId) {
    // Money may have arrived but we cannot tell whose it is. The admin sees this and decides.
    await store.logEvent({ provider: "modempay", eventType: type, paymentId: null, handled: false, outcome: "no_match", payload: event });
    return { status: 200, outcome: "no_match" };
  }

  let outcome: string;
  if (type === "charge.succeeded") {
    outcome = await store.markPaid(paymentId, extractRefs(payload)[0] ?? null, extractAmount(payload));
  } else if (type === "charge.failed") {
    outcome = await store.markStatus(paymentId, "failed", "Payment failed at Modem Pay");
  } else {
    outcome = await store.markStatus(paymentId, "cancelled", "Payment was cancelled");
  }

  await store.logEvent({
    provider: "modempay",
    eventType: type,
    paymentId: outcome === "not_found" ? null : paymentId,
    handled: outcome !== "not_found",
    outcome,
    payload: event,
  });
  return { status: 200, outcome };
}
