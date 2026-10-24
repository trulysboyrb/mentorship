import Link from "next/link";
import { METHODS, METHOD_ORDER, WHATSAPP_COLORS, type PayMethod } from "@/lib/paymentMethods";

// The payment buttons: Wave, Card, Crypto (each its own colour and page) and WhatsApp.
export default function PayButtons({
  waHref,
  enabled,
}: {
  waHref: string;
  enabled: Record<PayMethod, boolean>;
}) {
  const online = METHOD_ORDER.filter((m) => enabled[m]);
  const base =
    "block rounded-control px-4 py-3.5 text-center text-xs font-extrabold tracking-wider uppercase transition hover:brightness-110";
  return (
    <div className="mt-6 space-y-3">
      {online.length > 0 && (
        <div className={`grid gap-3 ${online.length === 1 ? "grid-cols-1" : online.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {online.map((m) => (
            <Link
              key={m}
              href={METHODS[m].route}
              className={base}
              style={{ background: METHODS[m].bg, color: METHODS[m].fg }}
            >
              Pay via {METHODS[m].label}
            </Link>
          ))}
        </div>
      )}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className={base}
        style={{ background: WHATSAPP_COLORS.bg, color: WHATSAPP_COLORS.fg }}
      >
        Pay via WhatsApp
      </a>
      {online.length > 0 && (
        <p className="text-center text-[11px] text-muted">
          Wave, Card and Crypto unlock your courses automatically. WhatsApp is confirmed by our team.
        </p>
      )}
    </div>
  );
}
