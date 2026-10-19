import { BRAND, WHATSAPP_NUMBER } from "./config";
import { REFERRAL_DISCOUNT_PERCENT, formatGMD, priceFor } from "./pricing";

export function whatsappLink(
  name: string,
  email: string,
  mode: string | null,
  opts: { referred?: boolean } = {}
) {
  const how = mode === "in_person" ? "in person" : "online";
  const { final } = priceFor(mode, !!opts.referred);
  const discount = opts.referred
    ? ` with my ${REFERRAL_DISCOUNT_PERCENT}% referral discount`
    : "";
  const message = `Hi, I just signed up on ${BRAND} as ${name} (${email}). I want to learn ${how} (${formatGMD(final)}${discount}) and I'm ready to pay.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappHelpLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
