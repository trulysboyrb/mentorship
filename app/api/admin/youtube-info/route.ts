import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{11}$/;

// Admin only. Reads video titles from YouTube so you do not have to type them.
// Works for unlisted videos. Best effort: a title that cannot be read comes back as null.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? (body!.ids as unknown[]).filter((x): x is string => typeof x === "string" && ID.test(x)).slice(0, 40)
    : [];

  const titles: Record<string, string | null> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) {
          titles[id] = null;
          return;
        }
        const j = (await res.json()) as { title?: unknown };
        titles[id] = typeof j.title === "string" ? j.title.slice(0, 120) : null;
      } catch {
        titles[id] = null;
      }
    })
  );
  return NextResponse.json({ titles });
}
