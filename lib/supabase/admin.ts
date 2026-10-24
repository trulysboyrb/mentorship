import { createClient } from "@supabase/supabase-js";

// SERVER ONLY. Uses the service role key, which can do anything in the database.
// Never import this file from a component that starts with "use client".
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
