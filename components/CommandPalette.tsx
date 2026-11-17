"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { baseItems, filterItems, sanitizeSearch, type PaletteItem } from "@/lib/palette";
import { THEME_KEY } from "@/lib/theme";

type Who = { loggedIn: boolean; isAdmin: boolean };

// Quick search / jump menu. Open with Ctrl+K (Cmd+K on Mac), "/" or the Search buttons.
// Admins can also find a student by name or email.
export default function CommandPalette() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Who | null>(null);
  const [students, setStudents] = useState<PaletteItem[]>([]);
  const [active, setActive] = useState(0);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const loadWho = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return setWho({ loggedIn: false, isAdmin: false });
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setWho({ loggedIn: true, isAdmin: data?.role === "admin" });
    } catch {
      setWho({ loggedIn: false, isAdmin: false });
    }
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    setQ("");
    setActive(0);
    setStudents([]);
    loadWho(); // refresh every time, in case the person logged in or out
  }, [loadWho]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        show();
      }
    };
    const onEvent = () => show();
    window.addEventListener("keydown", onKey);
    window.addEventListener("apex:palette", onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("apex:palette", onEvent);
    };
  }, [show]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // Admins: search students while typing (small delay so we do not ask on every key).
  useEffect(() => {
    if (!open || !who?.isAdmin) return;
    const term = sanitizeSearch(q);
    if (term.length < 2) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    const id = setTimeout(async () => {
      const { data } = await createClient()
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(6);
      if (cancelled) return;
      setStudents(
        (data ?? []).map((s) => ({
          id: `stu-${s.id}`,
          label: s.full_name,
          hint: s.email ?? "",
          group: "Students",
          href: `/admin?q=${encodeURIComponent(s.email ?? s.full_name)}`,
        }))
      );
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q, open, who]);

  const results = useMemo(() => {
    const base = filterItems(baseItems(!!who?.loggedIn, !!who?.isAdmin), q);
    return [...students, ...base];
  }, [who, q, students]);

  useEffect(() => setActive(0), [q, students.length]);

  async function run(item: PaletteItem) {
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    } else if (item.action === "theme") {
      const next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
    } else if (item.action === "signout") {
      await createClient().auth.signOut();
      router.push("/");
      router.refresh();
    }
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      run(results[active]);
    }
  }

  useEffect(() => {
    document.getElementById(`pal-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fade-quick fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-[12vh]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onMouseDown={(e) => e.stopPropagation()}
        className="menu-pop w-full max-w-lg border border-line bg-surface shadow-2xl"
      >
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder={who?.isAdmin ? "Jump to a page or find a student..." : "Jump to a page..."}
          role="combobox"
          aria-expanded="true"
          aria-controls="pal-list"
          aria-activedescendant={results[active] ? `pal-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="w-full border-b border-line bg-transparent px-5 py-4 text-sm text-white placeholder:text-muted focus:outline-none"
        />
        <ul id="pal-list" role="listbox" className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">Nothing found.</li>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <li key={r.id} role="presentation">
                {header && (
                  <p className="px-5 pt-3 pb-1 text-[10px] font-extrabold tracking-widest text-muted uppercase">{header}</p>
                )}
                <button
                  id={`pal-${i}`}
                  role="option"
                  aria-selected={i === active}
                  type="button"
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(r)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-2.5 text-left text-sm ${
                    i === active ? "bg-accent/10 text-white" : "text-white/80"
                  }`}
                >
                  <span className="min-w-0 truncate">{r.label}</span>
                  {r.hint && <span className="shrink-0 truncate text-[11px] text-muted">{r.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-5 py-2 text-[10px] text-muted">
          Up / Down to move, Enter to open, Esc to close
        </p>
      </div>
    </div>
  );
}
