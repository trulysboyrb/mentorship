import { BRAND, WHATSAPP_NUMBER } from "./config";
import { DEFAULT_PRICING, formatGMD, priceFor, type Pricing } from "./pricing";

export function whatsappLink(
  name: string,
  email: string,
  mode: string | null,
  opts: { referred?: boolean; pricing?: Pricing } = {}
) {
  const how = mode === "in_person" ? "in person" : "online";
  const pricing = opts.pricing ?? DEFAULT_PRICING;
  const { final } = priceFor(mode, !!opts.referred, pricing);
  const discount = opts.referred
    ? ` with my ${pricing.referralPercent}% referral discount`
    : "";
  const message = `Hi, I just signed up on ${BRAND} as ${name} (${email}). I want to learn ${how} (${formatGMD(final)}${discount}) and I'm ready to pay.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappHelpLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
