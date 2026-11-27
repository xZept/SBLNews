"use client";

import * as React from "react";
import Link from "next/link";
import {
  Ban,
  Check,
  MessageSquare,
  ShieldOff,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { useSocialDrawer } from "@/components/layout/social-drawer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  blockUserAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  unblockUserAction,
  unfriendAction,
} from "@/lib/actions/social";
import type {
  ProfileFriendshipState,
  TopAuraUser,
} from "@/lib/queries/projections";

interface ProfileFriendActionsProps {
  targetUser: TopAuraUser;
  initialState: ProfileFriendshipState;
  initialFriendshipId: string | null;
}

export function ProfileFriendActions({
  targetUser,
  initialState,
  initialFriendshipId,
}: ProfileFriendActionsProps) {
  const { profile, loading: authLoading } = useAccountProfile();
  const { openChatWithFriend, refreshCounts, refreshOverview } =
    useSocialDrawer();

  const [state, setState] =
    React.useState<ProfileFriendshipState>(initialState);
  const [friendshipId, setFriendshipId] = React.useState<string | null>(
    initialFriendshipId
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (state === "self") {
    return null;
  }

  if (state === "unavailable") {
    return (
      <div className="mt-3">
        <Badge variant="muted">Unavailable</Badge>
      </div>
    );
  }

  if (!authLoading && !profile) {
    return (
      <div className="mt-3">
        <Button asChild size="sm" variant="secondary">
          <Link href="/profile">
            <UserPlus className="h-3.5 w-3.5" />
            <span>Sign in to Add Friend</span>
          </Link>
        </Button>
      </div>
    );
  }

  if (authLoading) {
    return null;
  }

  async function syncSocialState() {
    await Promise.all([refreshCounts(), refreshOverview()]);
  }

  async function handleSendRequest() {
    setBusy(true);
    setError(null);
    try {
      const res = await sendFriendRequestAction({
        targetUserId: targetUser.id,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setState(res.state);
      setFriendshipId(res.friendshipId);
      await syncSocialState();
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(decision: "accept" | "decline" | "cancel") {
    if (!friendshipId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await respondFriendRequestAction({ friendshipId, decision });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setState(res.state);
      setFriendshipId(res.friendshipId);
      await syncSocialState();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnfriend() {
    setBusy(true);
    setError(null);
    try {
      const res = await unfriendAction({ targetUserId: targetUser.id });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setState(res.state);
      setFriendshipId(null);
      await syncSocialState();
    } finally {
      setBusy(false);
    }
  }

  async function handleBlock() {
    setBusy(true);
    setError(null);
    try {
      const res = await blockUserAction({ targetUserId: targetUser.id });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setState("blocked_by_me");
      setFriendshipId(res.friendshipId);
      await syncSocialState();
    } finally {
      setBusy(false);
    }
  }

  async function handleUnblock() {
    setBusy(true);
    setError(null);
    try {
      const res = await unblockUserAction({ targetUserId: targetUser.id });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setState("none");
      setFriendshipId(null);
      await syncSocialState();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {state === "none" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => void handleSendRequest()}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Friend</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleBlock()}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Block</span>
            </Button>
          </>
        )}

        {state === "outgoing_pending" && (
          <>
            <Badge variant="muted">Friend Request Sent</Badge>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleRespond("cancel")}
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleBlock()}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Block</span>
            </Button>
          </>
        )}

        {state === "incoming_pending" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => void handleRespond("accept")}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Accept</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleRespond("decline")}
            >
              <X className="h-3.5 w-3.5" />
              <span>Decline</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleBlock()}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Block</span>
            </Button>
          </>
        )}

        {state === "friends" && (
          <>
            <Badge variant="accent">Friends</Badge>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => openChatWithFriend(targetUser)}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Message</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleUnfriend()}
            >
              <UserMinus className="h-3.5 w-3.5" />
              <span>Unfriend</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleBlock()}
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Block</span>
            </Button>
          </>
        )}

        {state === "blocked_by_me" && (
          <>
            <Badge variant="muted">Blocked</Badge>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void handleUnblock()}
            >
              <ShieldOff className="h-3.5 w-3.5" />
              <span>Unblock</span>
            </Button>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border-2 border-accent-ink bg-badge-abstract px-2.5 py-1.5 font-mono text-xs font-semibold text-accent-ink"
        >
          {error}
        </p>
      )}
    </div>
  );
}
