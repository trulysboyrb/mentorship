// Optional email copy of payment alerts, sent through Resend (https://resend.com).
// Switched on by the RESEND_API_KEY environment variable plus an alert email in Settings.
// It never throws and never blocks a payment: if anything is wrong the payment still clears
// and the in-app alert is still there.

export type AlertEmailInput = {
  kind: "payment" | "underpaid";
  student: string;
  amountGmd: number | null;
  method: string;
  siteUrl?: string;
};

export function buildAlertEmail(i: AlertEmailInput): { subject: string; text: string } {
  const who = i.student.replace(/[\r\n]+/g, " ").trim().slice(0, 80) || "A student";
  const amount = i.amountGmd === null ? "" : ` D${i.amountGmd}`;
  const method = i.method.replace(/[^a-z]/gi, "").slice(0, 12);
  const link = i.siteUrl ? `\n\nOpen the admin page: ${i.siteUrl.replace(/\/$/, "")}/admin/payments` : "";
  if (i.kind === "underpaid") {
    return {
      subject: `Underpaid payment: ${who}`,
      text: `${who} paid less than the price${amount ? ` (price${amount})` : ""} via ${method}. The student was NOT cleared. Please check it.${link}`,
    };
  }
  return {
    subject: `New payment: ${who}`,
    text: `${who} paid${amount} via ${method}. Their account was cleared automatically.${link}`,
  };
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number }>;

// Returns true if Resend accepted the email.
export async function sendResend(
  fetchImpl: FetchLike,
  opts: { apiKey: string; from: string; to: string; subject: string; text: string; timeoutMs?: number }
): Promise<boolean> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: opts.from, to: [opts.to], subject: opts.subject, text: opts.text }),
      signal: ctl.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
