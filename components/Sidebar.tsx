import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

type Lesson = { id: string; position: number; title: string };
type Module = { id: string; position: number; title: string; lessons: Lesson[] };

function Lock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" className="shrink-0 text-muted" aria-label="Locked">
      <rect x="4" y="11" width="16" height="10" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="3" className="shrink-0 text-accent" aria-label="Completed">
      <path d="M4 12l6 6L20 6" />
    </svg>
  );
}

export default function Sidebar({
  modules,
  cleared,
  activeId,
  name,
  isAdmin,
  unlockedIds,
  completedIds,
}: {
  modules: Module[];
  cleared: boolean;
  activeId?: string;
  name: string;
  isAdmin: boolean;
  unlockedIds: string[];
  completedIds: string[];
}) {
  const unlocked = new Set(unlockedIds);
  const completed = new Set(completedIds);
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div className="flex min-h-full flex-col p-5">
      <h1 className="mb-6 text-xl font-black tracking-tight text-accent">
        APEXTRADE ACADEMY
      </h1>

      <nav className="flex-1 space-y-6">
        {modules.map((m) => (
          <div key={m.id}>
            <h2 className="mb-3 text-[10px] font-extrabold tracking-widest text-muted uppercase">
              Module {m.position} &middot; {m.title}
            </h2>
            <ul className="space-y-2">
              {m.lessons.map((l) => {
                const base =
                  "flex items-center gap-3 rounded-control border bg-surface-2 px-4 py-3 text-sm";

                if (!cleared) {
                  return (
                    <li key={l.id} className={`${base} border-line select-none`}>
                      <span className="blur-[4px]">{l.title}</span>
                      <span className="ml-auto"><Lock /></span>
                    </li>
                  );
                }

                if (!unlocked.has(l.id)) {
                  return (
                    <li key={l.id} className={`${base} border-line text-muted select-none`}>
                      {l.title}
                      <span className="ml-auto"><Lock /></span>
                    </li>
                  );
                }

                return (
                  <li key={l.id}>
                    <Link href={`/dashboard?lesson=${l.id}`}
                      className={`${base} ${
                        activeId === l.id
                          ? "border-accent text-white"
                          : "border-line text-white/80 hover:border-accent/60"
                      }`}>
                      {completed.has(l.id) ? (
                        <Check />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                      )}
                      {l.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-8 space-y-3 border-t border-line pt-5">
        <p className="truncate text-sm">{name}</p>
        <p className={`text-[10px] font-extrabold tracking-widest uppercase ${cleared ? "text-accent" : "text-danger"}`}>
          {cleared ? `${completed.size} of ${total} lessons completed` : "Payment pending"}
        </p>
        <div className="flex items-center gap-4">
          <SignOutButton />
          {isAdmin && (
            <Link href="/admin" className="text-xs text-accent hover:underline">
              Admin
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
