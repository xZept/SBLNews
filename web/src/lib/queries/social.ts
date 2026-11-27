import { createPublicClient } from "@/lib/supabase/server";
import {
  TOP_AURA_USER_COLUMNS,
  type TopAuraUser,
} from "@/lib/queries/projections";

/**
 * Fetches top community contributors ranked deterministically by Aura score
 * for the ISR-cached home feed left rail (`/`).
 *
 * Uses the cookie-free public Supabase client and strictly projects
 * `TOP_AURA_USER_COLUMNS`.
 */
export async function getTopAuraUsers(limit = 10): Promise<TopAuraUser[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(25, Math.floor(limit)));
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(TOP_AURA_USER_COLUMNS)
    .gt("aura_score", 0)
    .order("aura_score", { ascending: false })
    .order("display_name", { ascending: true })
    .order("id", { ascending: true })
    .limit(safeLimit);

  if (error) {
    console.error("Error fetching top Aura users:", error.message);
    return [];
  }

  return (data ?? []) as TopAuraUser[];
}
