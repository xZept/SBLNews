import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AccountProfile } from "@/lib/queries/projections";

export class AdminAuthError extends Error {
  readonly statusCode: 401 | 403;

  constructor(message: string, statusCode: 401 | 403) {
    super(message);
    this.name = "AdminAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Verifies the current session user has `profiles.role === 'admin'` on the server.
 * Use in Server Actions and API handlers where throwing is appropriate.
 */
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AdminAuthError("Authentication required", 401);
  }

  const { data, error: profileError } = await supabase.rpc(
    "get_my_account_profile"
  );

  const rows = data as AccountProfile[] | AccountProfile | null;
  const profile = Array.isArray(rows) ? rows[0] ?? null : rows ?? null;

  if (profileError || !profile || profile.role !== "admin") {
    throw new AdminAuthError("Administrator role required", 403);
  }

  return { supabase, user, profile };
}

/**
 * Page-level guard for `/admin/review` that redirects unauthorized visitors.
 */
export async function requireAdminPage() {
  try {
    return await assertAdmin();
  } catch {
    redirect("/");
  }
}
