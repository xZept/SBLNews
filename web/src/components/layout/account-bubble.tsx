"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Moon, ShieldCheck, Sun, User } from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import type { ThemePreferenceType } from "@/lib/queries/projections";
import { cn } from "@/lib/utils";

export function AccountBubble() {
  const { profile, email, theme, setThemeLocalAndPersist, signOutAndResetTheme } =
    useAccountProfile();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const popoverId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!profile) {
    return null;
  }

  const isAdmin = profile.role === "admin";

  async function handleThemeChange(nextTheme: ThemePreferenceType) {
    if (nextTheme === theme) {
      return;
    }
    await setThemeLocalAndPersist(nextTheme);
  }

  async function handleSignOut() {
    setSigningOut(true);
    setOpen(false);
    try {
      await signOutAndResetTheme();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border active:translate-x-[2px] active:translate-y-[2px] cursor-pointer",
          open && "ring-2 ring-accent ring-offset-2 ring-offset-surface"
        )}
      >
        <UserAvatar
          displayName={profile.display_name}
          avatarUrl={profile.avatar_url}
          size="md"
        />
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Account menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-md border-2 border-border bg-surface p-3 text-ink shadow-card"
        >
          {/* Identity summary */}
          <div className="flex items-start gap-3">
            <UserAvatar
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-display text-sm font-bold text-ink">
                  {profile.display_name}
                </p>
                <Badge variant={isAdmin ? "accent" : "default"}>
                  {isAdmin ? "Admin" : "Member"}
                </Badge>
              </div>
              {email && (
                <p className="mt-0.5 truncate font-mono text-xs text-muted">
                  {email}
                </p>
              )}
            </div>
          </div>

          <hr className="my-3 border-t-2 border-border/20" />

          {/* Primary links & theme toggle */}
          <div className="flex flex-col gap-1.5">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-sm border-[1.5px] border-transparent px-2.5 py-2 font-display text-sm font-bold text-ink hover:border-border hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
            >
              <User className="h-4 w-4 shrink-0" />
              <span>Profile</span>
            </Link>

            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <span className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                Theme
              </span>
              <div
                role="group"
                aria-label="Color theme"
                className="inline-flex items-center rounded-sm border-2 border-border bg-canvas p-0.5"
              >
                <button
                  type="button"
                  aria-pressed={theme === "light"}
                  onClick={() => void handleThemeChange("light")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xs px-2 py-1 font-mono text-xs font-semibold transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border",
                    theme === "light"
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Sun className="h-3 w-3" />
                  <span>Light</span>
                </button>
                <button
                  type="button"
                  aria-pressed={theme === "dark"}
                  onClick={() => void handleThemeChange("dark")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-xs px-2 py-1 font-mono text-xs font-semibold transition-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border",
                    theme === "dark"
                      ? "bg-accent text-accent-ink"
                      : "text-muted hover:text-ink"
                  )}
                >
                  <Moon className="h-3 w-3" />
                  <span>Dark</span>
                </button>
              </div>
            </div>

            {isAdmin && (
              <Link
                href="/admin/review"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-sm border-[1.5px] border-transparent px-2.5 py-2 font-display text-sm font-bold text-ink hover:border-border hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Admin Review Queue</span>
              </Link>
            )}
          </div>

          <hr className="my-3 border-t-2 border-border/20" />

          {/* Sign out */}
          <button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            className="flex w-full items-center gap-2 rounded-sm border-[1.5px] border-transparent px-2.5 py-2 text-left font-display text-sm font-bold text-ink hover:border-border hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{signingOut ? "Signing out..." : "Sign out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
