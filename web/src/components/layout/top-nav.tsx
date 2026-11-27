"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AccountBubble } from "@/components/layout/account-bubble";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { BrandLogo } from "@/components/layout/brand-logo";
import { useSocialDrawer } from "@/components/layout/social-drawer-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Feed" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/search", label: "Search" },
  { href: "/methodology", label: "Methodology" },
] as const;

export async function fetchIsAdmin(
  supabase: ReturnType<typeof createClient>,
  _userId?: string
): Promise<boolean> {
  void _userId;
  const { data, error } = await supabase.rpc("get_my_account_profile");

  if (error || !data) {
    return false;
  }

  const profile = Array.isArray(data)
    ? (data[0] as { role?: string } | undefined)
    : (data as { role?: string });

  return profile?.role === "admin";
}

export function TopNav() {
  const pathname = usePathname();
  const { profile, loading } = useAccountProfile();
  const { counts, openDrawer, triggerRef } = useSocialDrawer();

  async function handleOAuthSignIn(provider: "google" | "github") {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      pathname || "/"
    )}`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-ink"
          >
            <BrandLogo size="sm" />
            <span>SBL News</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-sm border-[1.5px] px-3 py-1 font-display text-sm font-bold transition-none",
                    isActive
                      ? "border-border bg-accent text-accent-ink shadow-control"
                      : "border-transparent text-ink hover:border-border hover:bg-canvas"
                  )}
                >
                  {link.href === "/search" && <Search className="h-3.5 w-3.5" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-9" aria-hidden="true" />
          ) : profile ? (
            <div className="flex items-center gap-2">
              <button
                ref={triggerRef}
                type="button"
                aria-label={
                  counts.totalBadge > 0
                    ? `Open Friends and Chat (${counts.totalBadge} unread)`
                    : "Open Friends and Chat"
                }
                onClick={() => openDrawer("friends")}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-border bg-surface text-ink shadow-control transition-transform hover:bg-canvas active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                {counts.totalBadge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-sm border-[1.5px] border-border bg-accent px-1 font-mono text-[10px] font-bold leading-tight text-accent-ink">
                    {counts.totalBadge > 99 ? "99+" : counts.totalBadge}
                  </span>
                )}
              </button>
              <AccountBubble />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => handleOAuthSignIn("google")}
              >
                Sign in with Google
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleOAuthSignIn("github")}
                className="hidden sm:inline-flex"
              >
                GitHub
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav
        aria-label="Mobile navigation"
        className="flex items-center gap-1 overflow-x-auto border-t-2 border-border bg-canvas px-4 py-2 md:hidden"
      >
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-sm border-[1.5px] px-2.5 py-1 font-display text-xs font-bold",
                isActive
                  ? "border-border bg-accent text-accent-ink shadow-control"
                  : "border-transparent bg-surface text-ink"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
