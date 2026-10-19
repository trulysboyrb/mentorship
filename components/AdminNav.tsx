import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

const LINKS: [string, string][] = [
  ["/admin", "Students"],
  ["/admin/courses", "Courses"],
  ["/admin/announcements", "Announcements"],
  ["/admin/questions", "Questions"],
  ["/admin/analytics", "Analytics"],
  ["/admin/settings", "Settings"],
];

export default function AdminNav({ current }: { current: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-xl font-black text-accent">ADMIN</h1>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`text-xs ${
              current === href ? "font-semibold text-white" : "text-muted hover:text-white"
            }`}
          >
            {label}
          </Link>
        ))}
        <Link href="/dashboard" className="text-xs text-accent hover:underline">
          Student area
        </Link>
        <SignOutButton />
      </nav>
    </header>
  );
}
