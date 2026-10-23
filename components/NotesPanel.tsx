export type NoteItem = {
  id: string;
  title: string;
  body: string | null;
  file_name: string | null;
  size: number | null;
  created_at: string;
  url: string | null;
  lesson_title: string | null;
};

function sizeText(n: number | null) {
  if (!n) return "";
  return n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

// "Notes" section of the Profile page: everything the admin has uploaded for students.
export default function NotesPanel({ items }: { items: NoteItem[] }) {
  return (
    <section className="mt-10">
      <h2 className="text-xs font-extrabold tracking-widest uppercase">Notes</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded-card border border-line bg-surface p-6 text-sm text-muted">No notes yet</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((n) => (
            <li key={n.id} className="rounded-card border border-line bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  <p className="mt-1 text-xs text-muted" suppressHydrationWarning>
                    {n.lesson_title ? `Lesson: ${n.lesson_title} · ` : ""}
                    {new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {n.file_name ? ` · ${n.file_name}${n.size ? ` (${sizeText(n.size)})` : ""}` : ""}
                  </p>
                </div>
                {n.url && (
                  <a
                    href={n.url}
                    className="rounded-control bg-accent px-5 py-2.5 text-xs font-extrabold tracking-wider text-black uppercase"
                  >
                    Download
                  </a>
                )}
              </div>
              {n.body && <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{n.body}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
