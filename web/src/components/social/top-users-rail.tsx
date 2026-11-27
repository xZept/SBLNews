"use client";

import * as React from "react";
import Link from "next/link";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { AuraBadge } from "@/components/social/aura-badge";
import { Card } from "@/components/ui/card";
import type { TopAuraUser } from "@/lib/queries/projections";

export interface TopUsersRailProps {
  users: TopAuraUser[];
}

function TopUsersList({ users }: { users: TopAuraUser[] }) {
  if (users.length === 0) {
    return (
      <p className="font-mono text-xs leading-relaxed text-muted">
        No Aura scores yet. Comment, endorse, upvote, or share studies to rank.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {users.map((user, index) => (
        <li key={user.id}>
          <Link
            href={`/profile/${user.id}`}
            className="flex items-center justify-between gap-2.5 rounded-sm border-[1.5px] border-transparent px-2 py-1.5 transition-none hover:border-border hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="w-5 shrink-0 font-mono text-xs font-bold text-muted">
                #{index + 1}
              </span>
              <UserAvatar
                displayName={user.display_name}
                avatarUrl={user.avatar_url}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-ink">
                  {user.display_name}
                </p>
                {user.affiliation_role && (
                  <p className="truncate font-mono text-[11px] text-muted">
                    {user.affiliation_role}
                  </p>
                )}
              </div>
            </div>

            <AuraBadge
              score={user.aura_score}
              variant={index === 0 ? "accent" : "surface"}
              className="px-1.5 py-0.5 text-[11px]"
            />
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function TopUsersRail({ users }: TopUsersRailProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const mobileListId = React.useId();

  return (
    <aside aria-label="Top contributors by Aura" className="min-w-0">
      {/* Mobile (< lg): Compact collapsible strip */}
      <div className="lg:hidden">
        <Card className="p-3">
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileListId}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
          >
            <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-ink">
              <Award className="h-4 w-4 shrink-0 text-ink" />
              <span>Top Contributors • Aura</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-muted">
              <span>{users.length > 0 ? `Top ${users.length}` : "Empty"}</span>
              {mobileOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          </button>

          {mobileOpen && (
            <div
              id={mobileListId}
              className="mt-3 border-t-2 border-border/15 pt-3"
            >
              <TopUsersList users={users} />
            </div>
          )}
        </Card>
      </div>

      {/* Desktop (lg+): Sticky 260px left rail */}
      <div className="hidden lg:block lg:w-[260px] lg:shrink-0 lg:sticky lg:top-20">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-border/15 pb-2.5">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 shrink-0 text-ink" />
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink">
                Top Users
              </h2>
            </div>
            <Link
              href="/methodology#aura-rubric"
              className="font-mono text-[11px] font-semibold text-muted underline hover:text-ink"
            >
              Aura
            </Link>
          </div>

          <TopUsersList users={users} />
        </Card>
      </div>
    </aside>
  );
}
