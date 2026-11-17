// The four ways to pay. Colours are fixed (not theme colours) so each button is easy to
// tell apart in both dark and light mode.

export type PayMethod = "wave" | "card" | "crypto";

export type MethodInfo = {
  label: string;
  route: string;
  bg: string; // button / accent colour
  fg: string; // text colour that reads well on bg
  provider: string; // who runs the checkout
  blurb: string;
  steps: string[];
};

export const METHODS: Record<PayMethod, MethodInfo> = {
  wave: {
    label: "Wave",
    route: "/pay/wave",
    bg: "#19b5f0",
    fg: "#000000",
    provider: "Modem Pay",
    blurb: "Pay with your Wave wallet. Quick and cleared automatically.",
    steps: [
      "Tap Continue. You go to a secure Modem Pay page.",
      "Choose Wave there and approve the payment on your phone.",
      "You come back here and your courses unlock by themselves, usually within a minute.",
    ],
  },
  card: {
    label: "Card",
    route: "/pay/card",
    bg: "#7c6cff",
    fg: "#ffffff",
    provider: "Modem Pay",
    blurb: "Pay with a debit or credit card. Cleared automatically.",
    steps: [
      "Tap Continue. You go to a secure Modem Pay page.",
      "Enter your card details there. We never see or store them.",
      "You come back here and your courses unlock by themselves, usually within a minute.",
    ],
  },
  crypto: {
    label: "Crypto",
    route: "/pay/crypto",
    bg: "#f7931a",
    fg: "#000000",
    provider: "NOWPayments",
    blurb: "Pay with crypto such as USDT or Bitcoin. Cleared after the network confirms it.",
    steps: [
      "Tap Continue. You go to a secure NOWPayments page.",
      "Pick your coin and send the exact amount shown to the address on that page.",
      "Your courses unlock once the network confirms the payment. This can take a few minutes.",
    ],
  },
};

export const WHATSAPP_COLORS = { bg: "#25d366", fg: "#000000" };

export const METHOD_ORDER: PayMethod[] = ["wave", "card", "crypto"];

export function isPayMethod(v: unknown): v is PayMethod {
  return v === "wave" || v === "card" || v === "crypto";
}

export type ClearedVia = "manual" | "whatsapp" | "wave" | "card" | "crypto" | null | undefined;

export function clearedViaLabel(v: ClearedVia): string {
  switch (v) {
    case "wave":
      return "Wave";
    case "card":
      return "Card";
    case "crypto":
      return "Crypto";
    case "whatsapp":
      return "WhatsApp";
    case "manual":
      return "Admin";
    default:
      return "";
  }
}
