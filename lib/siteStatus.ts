import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { parseSiteStatus, type SiteStatus } from "@/lib/siteSettings";

// Server side: read the admin's settings once per request.
export const getSiteStatus = cache(async (): Promise<SiteStatus> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("site_status");
    return parseSiteStatus(data);
  } catch {
    return parseSiteStatus(null);
  }
});
