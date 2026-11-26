"use client";

import * as React from "react";
import { ArrowBigUp } from "lucide-react";
import { toggleVoteAction } from "@/lib/actions/votes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface UpvoteButtonProps {
  studyId: string;
  initialCount: number;
  initialVoted?: boolean;
  orientation?: "vertical" | "horizontal";
}

export function UpvoteButton({
  studyId,
  initialCount,
  initialVoted = false,
  orientation = "vertical",
}: UpvoteButtonProps) {
  const [voted, setVoted] = React.useState(initialVoted);
  const [count, setCount] = React.useState(initialCount);
  const [isPending, setIsPending] = React.useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setVoted(initialVoted);
  }, [initialVoted]);

  React.useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  async function handleClick() {
    if (isPending) return;
    setErrorMsg(null);
    setShowAuthPrompt(false);

    const prevVoted = voted;
    const prevCount = count;
    const nextVoted = !prevVoted;

    // Optimistic update
    setVoted(nextVoted);
    setCount(Math.max(0, prevCount + (nextVoted ? 1 : -1)));
    setIsPending(true);

    try {
      const result = await toggleVoteAction({ studyId });
      if (!result.ok) {
        setVoted(prevVoted);
        setCount(prevCount);
        if (result.error === "AUTH_REQUIRED") {
          setShowAuthPrompt(true);
        } else {
          setErrorMsg(result.message);
        }
      } else {
        setVoted(result.voted);
      }
    } catch {
      setVoted(prevVoted);
      setCount(prevCount);
      setErrorMsg("Unable to update vote.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleOAuthSignIn(provider: "google" | "github") {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      window.location.pathname
    )}`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={voted}
        aria-label={voted ? `Remove upvote (${count})` : `Upvote study (${count})`}
        className={cn(
          "inline-flex items-center justify-center rounded-md border-2 border-border font-mono font-bold shadow-control transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 cursor-pointer",
          orientation === "vertical"
            ? "min-w-[54px] flex-col gap-0.5 px-2.5 py-2 text-xs"
            : "flex-row gap-1.5 px-3 py-1.5 text-sm",
          voted ? "bg-accent text-accent-ink" : "bg-surface text-ink hover:bg-canvas"
        )}
      >
        <ArrowBigUp
          className={cn(
            "h-4 w-4",
            voted ? "fill-accent-ink text-accent-ink" : "text-ink"
          )}
        />
        <span>{count}</span>
      </button>

      {showAuthPrompt && (
        <div
          role="dialog"
          aria-label="Sign in required to upvote"
          className="absolute top-full left-0 z-40 mt-2 w-60 rounded-md border-2 border-border bg-surface p-3 shadow-card"
        >
          <p className="mb-2 text-xs font-semibold text-ink">
            Sign in to upvote studies:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              className="rounded-sm border-[1.5px] border-border bg-accent px-2.5 py-1 font-display text-xs font-bold text-accent-ink cursor-pointer"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthSignIn("github")}
              className="rounded-sm border-[1.5px] border-border bg-surface px-2.5 py-1 font-display text-xs font-bold text-ink cursor-pointer"
            >
              GitHub
            </button>
            <button
              type="button"
              onClick={() => setShowAuthPrompt(false)}
              className="ml-auto font-mono text-xs text-muted hover:text-ink cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <p className="mt-1 font-mono text-[11px] text-ink" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
