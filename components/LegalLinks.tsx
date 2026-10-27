import Link from "next/link";

export default function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted ${className}`}
    >
      <Link href="/terms" className="hover:text-white">Terms</Link>
      <Link href="/privacy" className="hover:text-white">Privacy</Link>
      <Link href="/refund" className="hover:text-white">Refunds</Link>
      <Link href="/contact" className="hover:text-white">Contact</Link>
    </nav>
  );
}
