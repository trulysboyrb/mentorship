import { createHmac, timingSafeEqual } from "node:crypto";

// NOWPayments signs every IPN (payment update) it sends us. The signature is an
// HMAC-SHA512, with our IPN secret, of the JSON body with all keys sorted A to Z.

export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortKeysDeep(obj[k]);
        return acc;
      }, {});
  }
  return value;
}

export function signIpn(body: unknown, secret: string): string {
  return createHmac("sha512", secret).update(JSON.stringify(sortKeysDeep(body))).digest("hex");
}

export function verifyIpn(body: unknown, signature: string | null | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = Buffer.from(signIpn(body, secret), "utf8");
  const given = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type NowStatusAction =
  | { kind: "paid" }
  | { kind: "status"; status: "underpaid" | "failed" | "expired"; note: string }
  | { kind: "ignore" };

// What we do for each NOWPayments status. Only "finished" clears the student.
export function mapNowStatus(status: unknown): NowStatusAction {
  switch (status) {
    case "finished":
      return { kind: "paid" };
    case "partially_paid":
      return { kind: "status", status: "underpaid", note: "Crypto payment was only partly paid" };
    case "failed":
      return { kind: "status", status: "failed", note: "Crypto payment failed" };
    case "refunded":
      return { kind: "status", status: "failed", note: "Crypto payment was refunded" };
    case "expired":
      return { kind: "status", status: "expired", note: "Crypto invoice expired before it was paid" };
    default:
      // waiting, confirming, confirmed, sending, anything new: wait for the final status
      return { kind: "ignore" };
  }
}

export type InvoiceInput = {
  orderId: string;
  priceUsd: number;
  description: string;
  ipnUrl: string;
  successUrl: string;
  cancelUrl: string;
};

export function buildInvoiceBody(i: InvoiceInput) {
  return {
    price_amount: i.priceUsd,
    price_currency: "usd",
    order_id: i.orderId,
    order_description: i.description,
    ipn_callback_url: i.ipnUrl,
    success_url: i.successUrl,
    cancel_url: i.cancelUrl,
  };
}

export function parseInvoiceResponse(json: unknown): { url: string; ref: string | null } | null {
  const j = json as { invoice_url?: unknown; id?: unknown } | null;
  if (!j || typeof j.invoice_url !== "string" || !/^https:\/\//.test(j.invoice_url)) return null;
  return { url: j.invoice_url, ref: j.id === undefined || j.id === null ? null : String(j.id) };
}
