import type { PayMethod } from "./paymentMethods";

export type Env = Record<string, string | undefined>;

export type Availability = { ok: boolean; reason?: string; provider?: "modempay" | "nowpayments" | "mock" };

export function mockEnabled(env: Env): boolean {
  // Mock mode is for testing on your own computer only. It can never be on in production.
  return env.PAYMENTS_MOCK === "1" && env.NODE_ENV !== "production";
}

// Which payment buttons can actually work right now, based on the secret keys that are set.
export function availability(env: Env, gmdPerUsd: number | null): Record<PayMethod, Availability> {
  const has = (k: string) => !!env[k] && env[k]!.trim() !== "";
  const base = has("SUPABASE_SERVICE_ROLE_KEY");

  if (mockEnabled(env)) {
    const mock: Availability = base
      ? { ok: true, provider: "mock" }
      : { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY is missing" };
    return { wave: mock, card: mock, crypto: mock };
  }

  const modem: Availability = !base
    ? { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY is missing" }
    : !has("MODEMPAY_SECRET_KEY")
      ? { ok: false, reason: "MODEMPAY_SECRET_KEY is missing" }
      : !has("MODEMPAY_WEBHOOK_SECRET")
        ? { ok: false, reason: "MODEMPAY_WEBHOOK_SECRET is missing" }
        : { ok: true, provider: "modempay" };

  const crypto: Availability = !base
    ? { ok: false, reason: "SUPABASE_SERVICE_ROLE_KEY is missing" }
    : !has("NOWPAYMENTS_API_KEY")
      ? { ok: false, reason: "NOWPAYMENTS_API_KEY is missing" }
      : !has("NOWPAYMENTS_IPN_SECRET")
        ? { ok: false, reason: "NOWPAYMENTS_IPN_SECRET is missing" }
        : !gmdPerUsd || gmdPerUsd <= 0
          ? { ok: false, reason: "Set the dalasi-per-dollar rate in Admin > Settings" }
          : { ok: true, provider: "nowpayments" };

  return { wave: modem, card: modem, crypto };
}

// Which payment methods Modem Pay's checkout page should offer.
// Card is a documented value. For Wave we do not restrict the page by default, because
// Modem Pay's docs do not spell out the Wave value: the student picks Wave on their page.
// If Modem Pay tells you the exact value, set MODEMPAY_WAVE_METHODS (comma separated).
export function modemMethods(method: PayMethod, env: Env): string[] | undefined {
  if (method === "card") return ["card"];
  if (method === "wave") {
    const raw = env.MODEMPAY_WAVE_METHODS?.split(",").map((s) => s.trim()).filter(Boolean);
    return raw && raw.length > 0 ? raw : undefined;
  }
  return undefined;
}

export function siteUrl(env: Env, requestOrigin: string): string {
  const fromEnv = env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return fromEnv || requestOrigin.replace(/\/+$/, "");
}

export function nowPaymentsBase(env: Env): string {
  return env.NOWPAYMENTS_SANDBOX === "1" ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
}
