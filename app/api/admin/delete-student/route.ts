import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Check = {
  found: boolean;
  name?: string;
  email?: string | null;
  whatsapp?: string | null;
  was_cleared?: boolean;
  cleared_via?: string | null;
  blockers: string[];
  warnings: string[];
};

// Admin only. Permanently deletes a student's account so they can sign up fresh
// (even with the same email). Payment records are kept for your accounts.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { id?: unknown; force?: unknown } | null;
  const id = typeof body?.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!id) return NextResponse.json({ error: "Bad student id." }, { status: 400 });

  // The database decides what is safe (and re-checks that the caller is an admin).
  const { data: checkRaw, error: checkErr } = await supabase.rpc("admin_delete_check", { target: id });
  if (checkErr) {
    return NextResponse.json(
      { error: `${checkErr.message}. Did you run the Phase 11 SQL?` },
      { status: 500 }
    );
  }
  const check = checkRaw as Check;
  if (!check.found) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  if (check.blockers.length > 0) {
    return NextResponse.json({ error: check.blockers.join(". "), blockers: check.blockers }, { status: 400 });
  }
  if (check.warnings.length > 0 && body?.force !== true) {
    return NextResponse.json({ needsConfirm: true, warnings: check.warnings }, { status: 409 });
  }

  let db;
  try {
    db = createAdminClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server." }, { status: 503 });
  }

  // Remember which files to clean up (certificates) before the rows disappear.
  const { data: certs } = await db.from("certificates").select("file_path").eq("user_id", id);

  const { error: delErr } = await db.auth.admin.deleteUser(id);
  if (delErr) {
    return NextResponse.json({ error: `Could not delete: ${delErr.message}` }, { status: 500 });
  }

  const paths = (certs ?? []).map((c) => c.file_path).filter((p): p is string => !!p);
  if (paths.length > 0) {
    await db.storage.from("certificates").remove(paths).catch(() => null);
  }

  // A small record of who was deleted, when, and by whom.
  await db.from("deleted_students").insert({
    student_id: id,
    full_name: check.name ?? null,
    email: check.email ?? null,
    whatsapp: check.whatsapp ?? null,
    was_cleared: !!check.was_cleared,
    cleared_via: check.cleared_via ?? null,
    deleted_by: user.id,
  });

  return NextResponse.json({ ok: true });
}
