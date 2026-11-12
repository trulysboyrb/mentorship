import { buildInvoiceBody, parseInvoiceResponse } from "./nowpayments";
import { buildIntentBody, parseIntentResponse } from "./modempay";
import { modemMethods, nowPaymentsBase, type Env } from "../paymentConfig";
import type { PayMethod } from "../paymentMethods";

export type StartInput = {
  method: PayMethod;
  provider: "modempay" | "nowpayments" | "mock";
  paymentId: string;
  amountGmd: number;
  amountUsd: number | null;
  charge?: { currency: "GMD" | "USD"; amount: number }; // card only; default is dalasi
  studentName: string;
  site: string; // e.g. https://yourapp.vercel.app
  env: Env;
  fetchFn?: typeof fetch;
};

export type StartResult = { ok: true; url: string; ref: string | null } | { ok: false; error: string };

const TITLE = "ApexTrade Academy course";

// Asks the payment company for a checkout page and returns its address.
export async function startCheckout(i: StartInput): Promise<StartResult> {
  const f = i.fetchFn ?? fetch;
  const returnUrl = `${i.site}/pay/return?p=${i.paymentId}`;
  const cancelUrl = `${i.site}/pay/${i.method}?cancelled=1`;

  if (i.provider === "mock") {
    return { ok: true, url: `${i.site}/pay/mock?p=${i.paymentId}`, ref: null };
  }

  try {
    if (i.provider === "modempay") {
      const res = await f("https://api.modempay.com/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${i.env.MODEMPAY_SECRET_KEY}` },
        body: JSON.stringify(
          buildIntentBody({
            orderId: i.paymentId,
            amountGmd: i.amountGmd,
            charge: i.charge,
            title: TITLE,
            description: `Course fee for ${i.studentName}`,
            returnUrl,
            cancelUrl,
            paymentMethods: modemMethods(i.method, i.env),
          })
        ),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = (json as { message?: string } | null)?.message;
        const usd = i.charge?.currency === "USD";
        return {
          ok: false,
          error: usd
            ? `Modem Pay could not take a US dollar card payment (${msg ?? `error ${res.status}`}). Please use Crypto or WhatsApp.`
            : `Modem Pay said: ${msg ?? `error ${res.status}`}`,
        };
      }
      const parsed = parseIntentResponse(json);
      return parsed ? { ok: true, ...parsed } : { ok: false, error: "Modem Pay did not return a payment link." };
    }

    // nowpayments
    if (i.amountUsd === null) return { ok: false, error: "The crypto price is not set up yet." };
    const res = await f(`${nowPaymentsBase(i.env)}/v1/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": String(i.env.NOWPAYMENTS_API_KEY) },
      body: JSON.stringify(
        buildInvoiceBody({
          orderId: i.paymentId,
          priceUsd: i.amountUsd,
          description: `${TITLE} for ${i.studentName}`,
          ipnUrl: `${i.site}/api/webhooks/nowpayments`,
          successUrl: returnUrl,
          cancelUrl,
        })
      ),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (json as { message?: string } | null)?.message;
      return { ok: false, error: `NOWPayments said: ${msg ?? `error ${res.status}`}` };
    }
    const parsed = parseInvoiceResponse(json);
    return parsed ? { ok: true, ...parsed } : { ok: false, error: "NOWPayments did not return an invoice link." };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? `Could not reach the payment company: ${e.message}` : "Could not reach the payment company." };
  }
}
