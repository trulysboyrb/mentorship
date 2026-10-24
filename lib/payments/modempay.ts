// Modem Pay: one API for Wave and card payments in dalasi.
// Docs: https://docs.modempay.com/documentation/payment-intents/create

export type IntentInput = {
  orderId: string;
  amountGmd: number;
  title: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
  paymentMethods?: string[];
};

export function buildIntentBody(i: IntentInput) {
  const data: Record<string, unknown> = {
    amount: i.amountGmd,
    currency: "GMD",
    title: i.title,
    description: i.description,
    metadata: { order_id: i.orderId },
    return_url: i.returnUrl,
    cancel_url: i.cancelUrl,
  };
  if (i.paymentMethods && i.paymentMethods.length > 0) data.payment_methods = i.paymentMethods;
  return { data };
}

export function parseIntentResponse(json: unknown): { url: string; ref: string | null } | null {
  const d = (json as { data?: Record<string, unknown> } | null)?.data;
  if (!d || typeof d.payment_link !== "string" || !/^https:\/\//.test(d.payment_link)) return null;
  const id = d.id ?? d.intent_id ?? d.payment_intent_id;
  return { url: d.payment_link, ref: typeof id === "string" ? id : null };
}

type Loose = Record<string, any> | null | undefined;

// The webhook payload is not fully documented, so we look in the places it is likely to be.
export function extractOrderId(payload: Loose): string | null {
  const candidates = [
    payload?.metadata?.order_id,
    payload?.payment_intent?.metadata?.order_id,
    payload?.intent?.metadata?.order_id,
    payload?.data?.metadata?.order_id,
  ];
  for (const c of candidates) if (typeof c === "string" && /^[0-9a-f-]{36}$/i.test(c)) return c;
  return null;
}

export function extractRefs(payload: Loose): string[] {
  const refs: unknown[] = [
    payload?.payment_intent,
    payload?.payment_intent?.id,
    payload?.intent_id,
    payload?.intent,
    payload?.intent?.id,
    payload?.id,
  ];
  return refs.filter((r): r is string => typeof r === "string" && r.length > 0);
}

// Amount in dalasi if the payload carries one we can read.
export function extractAmount(payload: Loose): number | null {
  const raw = payload?.amount ?? payload?.payment_intent?.amount ?? payload?.intent?.amount;
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}
