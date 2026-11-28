"use client";

import * as React from "react";
import { Lock, Sparkles, X } from "@/components/ui/pixel-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface AskAiOAuthPromptProps {
  /** Optional query text to preserve in the post-login /search?ai=1&q=... destination. */
  query?: string;
  /** Optional active study_design filter to preserve in the return URL. */
  studyDesign?: string;
  /** Optional min_duration_weeks filter to preserve in the return URL. */
  minDurationWeeks?: string | number;
  /** Optional trained_only filter to preserve in the return URL. */
  trainedOnly?: boolean;
  /** Optional callback to dismiss the inline prompt. */
  onDismiss?: () => void;
}

export interface SearchPathParams {
  query?: string;
  studyDesign?: string;
  minDurationWeeks?: string | number;
  trainedOnly?: boolean;
}

function buildSearchParams(
  params: SearchPathParams,
  options?: { includeAi?: boolean }
): URLSearchParams {
  const sp = new URLSearchParams();
  if (options?.includeAi) {
    sp.set("ai", "1");
  }
  const trimmedQ = params.query?.trim();
  if (trimmedQ) {
    sp.set("q", trimmedQ);
  }
  if (params.studyDesign && params.studyDesign !== "all") {
    sp.set("study_design", params.studyDesign);
  }
  if (params.minDurationWeeks !== undefined && params.minDurationWeeks !== "") {
    const parsedWeeks =
      typeof params.minDurationWeeks === "number"
        ? params.minDurationWeeks
        : Number.parseInt(params.minDurationWeeks, 10);
    if (Number.isFinite(parsedWeeks) && parsedWeeks >= 0) {
      sp.set("min_duration_weeks", String(parsedWeeks));
    }
  }
  if (params.trainedOnly) {
    sp.set("trained_only", "true");
  }
  return sp;
}

/** Build a public `/search` URL for standard keyword/filter search (no `ai=1`). */
export function buildStandardSearchPath(params: SearchPathParams): string {
  const qs = buildSearchParams(params).toString();
  return qs ? `/search?${qs}` : "/search";
}

/** Build an `/search?ai=1...` URL that triggers AI synthesis on arrival/return. */
export function buildAskAiReturnPath(params: SearchPathParams): string {
  return `/search?${buildSearchParams(params, { includeAi: true }).toString()}`;
}

export function AskAiOAuthPrompt({
  query,
  studyDesign,
  minDurationWeeks,
  trainedOnly,
  onDismiss,
}: AskAiOAuthPromptProps) {
  const [signingInProvider, setSigningInProvider] = React.useState<
    "google" | "github" | null
  >(null);

  async function handleOAuthSignIn(provider: "google" | "github") {
    setSigningInProvider(provider);
    try {
      const supabase = createClient();
      const nextPath = buildAskAiReturnPath({
        query,
        studyDesign,
        minDurationWeeks,
        trainedOnly,
      });
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`;
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
    } finally {
      setSigningInProvider(null);
    }
  }

  return (
    <div
      role="region"
      aria-label="Sign in for Ask AI literature synthesis"
      className="rpg-dialog-frame rounded-sm border-2 border-border bg-surface p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-accent text-accent-ink shadow-control">
            <Lock className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <p className="font-pixel text-[10px] font-bold uppercase tracking-wider text-muted">
              QUEST GATE • OAUTH REQUIRED
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold text-ink">
                Sign in to use Ask AI Synthesis
              </h3>
              <span className="inline-flex items-center gap-1 rounded-sm border-[1.5px] border-border bg-canvas px-2 py-0.5 font-mono text-[11px] font-bold text-ink">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                10 FREE / DAY
              </span>
            </div>
            <p className="max-w-[68ch] text-sm text-muted">
              Signed-in members get 10 free citation-grounded AI literature
              syntheses per day. Standard keyword, semantic, and filter search
              remains 100% public and unlimited.
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close sign-in prompt"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-border bg-canvas text-ink hover:bg-surface cursor-pointer"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5 pl-0 sm:pl-12">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={signingInProvider !== null}
          onClick={() => void handleOAuthSignIn("google")}
        >
          {signingInProvider === "google"
            ? "Connecting Google..."
            : "Sign in with Google"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={signingInProvider !== null}
          onClick={() => void handleOAuthSignIn("github")}
        >
          {signingInProvider === "github"
            ? "Connecting GitHub..."
            : "Sign in with GitHub"}
        </Button>
      </div>
    </div>
  );
}
