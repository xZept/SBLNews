"use client";

import * as React from "react";
import Link from "next/link";
import { Lock } from "@/components/ui/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export function ProfileSignInGate() {
  async function handleOAuthSignIn(provider: "google" | "github") {
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/profile"
    )}`;
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
  }

  return (
    <div className="mx-auto max-w-lg py-8">
      <Card variant="dialog">
        <CardHeader>
          <p className="font-pixel text-[10px] font-bold uppercase tracking-wider text-muted">
            QUEST GATE • AUTHENTICATION
          </p>
          <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-sm border-2 border-border bg-accent text-accent-ink shadow-control">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle>Sign in to manage your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Customize your community display name, training or research role
            tag, profile photo, theme preference, and view your upvoted studies
            and comment history.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleOAuthSignIn("google")}
            >
              Sign in with Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleOAuthSignIn("github")}
            >
              Sign in with GitHub
            </Button>
          </div>
          <div className="border-t-2 border-border/15 pt-3">
            <Link
              href="/"
              className="font-mono text-xs font-semibold text-ink hover:underline"
            >
              &larr; Back to Main Research Feed
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
