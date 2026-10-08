import { BRAND, WHATSAPP_NUMBER } from "@/lib/config";

export function whatsappLink(name: string, email: string, mode: string | null) {
  const how = mode === "in_person" ? "in person" : "online";
  const message = `Hi, I just signed up on ${BRAND} as ${name} (${email}). I want to learn ${how} and I'm ready to pay.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
