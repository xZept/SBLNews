"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogOut, Search, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Feed" },
  { href: "/guidelines", label: "Guidelines" },
  { href: "/search", label: "Search" },
  { href: "/methodology", label: "Methodology" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setAuthReady(true);
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthReady(true);
        }
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      // Env vars may be absent during static build/test environments
      setAuthReady(true);
      return () => {
        mounted = false;
      };
    }
  }, []);

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink bg-surface">
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
                    "inline-flex items-center gap-1.5 rounded-sm border-[1.5px] px-3 py-1 font-display text-sm font-bold text-ink transition-none",
                    isActive
                      ? "border-ink bg-accent shadow-[2px_2px_0px_#0F172A]"
                      : "border-transparent hover:border-ink hover:bg-canvas"
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
          {authReady && user ? (
            <>
              <Link
                href="/admin/review"
                className="hidden items-center gap-1 rounded-sm border-[1.5px] border-ink bg-canvas px-2.5 py-1 font-mono text-xs font-semibold text-ink hover:bg-accent sm:inline-flex"
                title="Moderation & Consensus Drift Review"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Link>
              <span className="hidden font-mono text-xs text-muted sm:inline">
                {user.user_metadata?.full_name ||
                  user.user_metadata?.user_name ||
                  user.email ||
                  "Signed in"}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </Button>
            </>
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
        className="flex items-center gap-1 overflow-x-auto border-t-2 border-ink bg-canvas px-4 py-2 md:hidden"
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
                "shrink-0 rounded-sm border-[1.5px] px-2.5 py-1 font-display text-xs font-bold text-ink",
                isActive
                  ? "border-ink bg-accent shadow-[2px_2px_0px_#0F172A]"
                  : "border-transparent bg-surface"
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
