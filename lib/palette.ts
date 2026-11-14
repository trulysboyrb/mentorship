// Quick-search (Ctrl+K) data and matching. Pure functions so they can be tested.

export type PaletteItem = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href?: string;
  action?: "theme" | "signout";
  keywords?: string;
};

export function baseItems(loggedIn: boolean, isAdmin: boolean): PaletteItem[] {
  if (!loggedIn) {
    return [
      { id: "home", label: "Home", group: "Go to", href: "/" },
      { id: "login", label: "Log in", group: "Go to", href: "/login" },
      { id: "signup", label: "Sign up", group: "Go to", href: "/signup" },
      { id: "contact", label: "Contact Us", group: "Go to", href: "/contact", keywords: "help support whatsapp email" },
      { id: "theme", label: "Switch dark / light mode", group: "Actions", action: "theme", keywords: "theme appearance" },
    ];
  }
  const items: PaletteItem[] = [
    { id: "dashboard", label: "My lessons", hint: "Dashboard", group: "Go to", href: "/dashboard", keywords: "dashboard courses videos" },
    { id: "classes", label: "Live classes", hint: "Schedule and reminders", group: "Go to", href: "/classes" },
    { id: "contact", label: "Contact Us", hint: "Send us a message", group: "Go to", href: "/contact", keywords: "help support whatsapp email" },
    { id: "profile", label: "Profile", hint: "Photo, details, certificates, referrals", group: "Go to", href: "/profile", keywords: "photo picture avatar certificate referral devices" },
  ];
  if (isAdmin) {
    const a: [string, string, string?][] = [
      ["/admin", "Students"],
      ["/admin/overview", "Overview", "revenue money"],
      ["/admin/courses", "Courses", "modules lessons videos"],
      ["/admin/quizzes", "Quizzes"],
      ["/admin/notes", "Notes", "resources downloads"],
      ["/admin/classes", "Live classes (admin)", "schedule"],
      ["/admin/announcements", "Announcements"],
      ["/admin/questions", "Questions"],
      ["/admin/payments", "Payments", "wave card crypto"],
      ["/admin/payouts", "Payouts", "referral"],
      ["/admin/analytics", "Analytics", "funnel"],
      ["/admin/alerts", "Alerts", "new payment underpaid notifications bell"],
      ["/admin/activity", "Activity log", "audit history who did what"],
      ["/admin/settings", "Settings", "banner contact certificate template alerts maintenance prices"],
    ];
    for (const [href, label, kw] of a) {
      items.push({ id: `admin-${href}`, label, hint: "Admin", group: "Admin", href, keywords: kw });
    }
  }
  items.push({ id: "theme", label: "Switch dark / light mode", group: "Actions", action: "theme", keywords: "theme appearance" });
  items.push({ id: "signout", label: "Log out", group: "Actions", action: "signout", keywords: "sign out" });
  return items;
}

// Every word you type must appear somewhere in the item. Items starting with your text come first.
export function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  const scored: { item: PaletteItem; rank: number; i: number }[] = [];
  items.forEach((item, i) => {
    const label = item.label.toLowerCase();
    const hay = `${label} ${(item.hint ?? "").toLowerCase()} ${(item.keywords ?? "").toLowerCase()}`;
    if (!words.every((w) => hay.includes(w))) return;
    scored.push({ item, rank: label.startsWith(words[0]) ? 0 : label.includes(words[0]) ? 1 : 2, i });
  });
  return scored.sort((a, b) => a.rank - b.rank || a.i - b.i).map((s) => s.item);
}

// The student search is sent to the database inside an .or() filter, so strip characters that
// could change the filter's meaning.
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\"'`:;]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
}
