import { notFound } from "next/navigation";
import { mockEnabled } from "@/lib/paymentConfig";
import MockCheckout from "@/components/MockCheckout";

// TESTING ONLY: a fake payment company page. Disabled unless PAYMENTS_MOCK=1 (never in production).
export default async function MockPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  if (!mockEnabled(process.env)) notFound();
  const { p } = await searchParams;
  return <MockCheckout payment={p ?? ""} />;
}
