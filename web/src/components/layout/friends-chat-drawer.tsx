"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Ban,
  Check,
  MessageSquare,
  Search,
  Send,
  ShieldOff,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { useSocialDrawer } from "@/components/layout/social-drawer-provider";
import { UserAvatar } from "@/components/profile/user-avatar";
import { AuraBadge } from "@/components/social/aura-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  blockUserAction,
  getChatThreadAction,
  markThreadReadAction,
  respondFriendRequestAction,
  searchUsersAction,
  sendDirectMessageAction,
  sendFriendRequestAction,
  unblockUserAction,
  unfriendAction,
} from "@/lib/actions/social";
import type {
  DirectMessageItem,
  FriendConnectionItem,
} from "@/lib/queries/projections";
import type {
  ChatThreadCursor,
  SocialSearchResultItem,
} from "@/lib/queries/social";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";
import { cn } from "@/lib/utils";
import {
  SearchUsersByDisplayNameSchema,
  SendDirectMessageSchema,
} from "@/lib/validations/social";

function formatMsgTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function FriendsChatDrawer() {
  const { profile } = useAccountProfile();
  const {
    isOpen,
    activeTab,
    activeFriend,
    overview,
    overviewLoading,
    openChatWithFriend,
    closeDrawer,
    setActiveTab,
    setActiveFriend,
    refreshCounts,
    refreshOverview,
  } = useSocialDrawer();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    SocialSearchResultItem[]
  >([]);
  const [searching, setSearching] = React.useState(false);
  const [friendsError, setFriendsError] = React.useState<string | null>(null);
  const [mutatingId, setMutatingId] = React.useState<string | null>(null);

  const [messages, setMessages] = React.useState<DirectMessageItem[]>([]);
  const [threadCursor, setThreadCursor] =
    React.useState<ChatThreadCursor | null>(null);
  const [threadHasMore, setThreadHasMore] = React.useState(false);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [sendingMsg, setSendingMsg] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);

  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeDrawer]);

  React.useEffect(() => {
    if (!isOpen || activeTab !== "chat" || !activeFriend) {
      return;
    }

    let cancelled = false;
    setLoadingThread(true);
    setChatError(null);

    async function loadThread() {
      if (!activeFriend) return;
      try {
        const res = await getChatThreadAction({ friendId: activeFriend.id });
        if (cancelled) return;
        if (!res.ok) {
          setChatError(res.message);
          return;
        }
        setMessages([...res.page.items].reverse());
        setThreadCursor(res.page.nextCursor);
        setThreadHasMore(res.page.hasMore);

        await markThreadReadAction({ friendId: activeFriend.id });
        if (!cancelled) {
          void refreshCounts();
          void refreshOverview();
        }
      } catch {
        if (!cancelled) {
          setChatError("Failed to load conversation.");
        }
      } finally {
        if (!cancelled) {
          setLoadingThread(false);
        }
      }
    }

    void loadThread();
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeTab, activeFriend, refreshCounts, refreshOverview]);

  if (!isOpen || !profile) {
    return null;
  }

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setFriendsError(null);

    const parsed = SearchUsersByDisplayNameSchema.safeParse({
      query: searchQuery,
    });
    if (!parsed.success) {
      setFriendsError(
        parsed.error.issues[0]?.message ?? "Enter at least 2 characters."
      );
      return;
    }

    setSearching(true);
    try {
      const res = await searchUsersAction(parsed.data);
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      setSearchResults(res.users);
    } catch {
      setFriendsError("Failed to search users.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSendRequest(targetUserId: string) {
    setMutatingId(targetUserId);
    setFriendsError(null);
    try {
      const res = await sendFriendRequestAction({ targetUserId });
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      setSearchResults((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                friendship_state: res.state,
                friendship_id: res.friendshipId,
              }
            : u
        )
      );
      await Promise.all([refreshOverview(), refreshCounts()]);
    } finally {
      setMutatingId(null);
    }
  }

  async function handleRespond(
    friendshipId: string,
    decision: "accept" | "decline" | "cancel"
  ) {
    setMutatingId(friendshipId);
    setFriendsError(null);
    try {
      const res = await respondFriendRequestAction({ friendshipId, decision });
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      await Promise.all([refreshOverview(), refreshCounts()]);
    } finally {
      setMutatingId(null);
    }
  }

  async function handleUnfriend(targetUserId: string) {
    setMutatingId(targetUserId);
    setFriendsError(null);
    try {
      const res = await unfriendAction({ targetUserId });
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      if (activeFriend?.id === targetUserId) {
        setActiveFriend(null);
      }
      await Promise.all([refreshOverview(), refreshCounts()]);
    } finally {
      setMutatingId(null);
    }
  }

  async function handleBlock(targetUserId: string) {
    setMutatingId(targetUserId);
    setFriendsError(null);
    try {
      const res = await blockUserAction({ targetUserId });
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      if (activeFriend?.id === targetUserId) {
        setActiveFriend(null);
      }
      await Promise.all([refreshOverview(), refreshCounts()]);
    } finally {
      setMutatingId(null);
    }
  }

  async function handleUnblock(targetUserId: string) {
    setMutatingId(targetUserId);
    setFriendsError(null);
    try {
      const res = await unblockUserAction({ targetUserId });
      if (!res.ok) {
        setFriendsError(res.message);
        return;
      }
      await Promise.all([refreshOverview(), refreshCounts()]);
    } finally {
      setMutatingId(null);
    }
  }

  async function handleLoadOlder() {
    if (!activeFriend || !threadCursor || loadingOlder) return;
    setLoadingOlder(true);
    setChatError(null);
    try {
      const res = await getChatThreadAction({
        friendId: activeFriend.id,
        cursorCreatedAt: threadCursor.cursorCreatedAt,
        cursorMessageId: threadCursor.cursorMessageId,
      });
      if (!res.ok) {
        setChatError(res.message);
        return;
      }
      const olderChronological = [...res.page.items].reverse();
      setMessages((prev) => [...olderChronological, ...prev]);
      setThreadCursor(res.page.nextCursor);
      setThreadHasMore(res.page.hasMore);
    } catch {
      setChatError("Failed to load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeFriend || sendingMsg) return;
    setChatError(null);

    const parsed = SendDirectMessageSchema.safeParse({
      recipientId: activeFriend.id,
      body: draft,
    });
    if (!parsed.success) {
      setChatError(parsed.error.issues[0]?.message ?? "Invalid message.");
      return;
    }

    setSendingMsg(true);
    try {
      const res = await sendDirectMessageAction(parsed.data);
      if (!res.ok) {
        setChatError(res.message);
        return;
      }
      setMessages((prev) => [...prev, res.message]);
      setDraft("");
    } catch {
      setChatError("Failed to send message.");
    } finally {
      setSendingMsg(false);
    }
  }

  const acceptedFriends: FriendConnectionItem[] = overview?.accepted ?? [];
  const incomingPending: FriendConnectionItem[] =
    overview?.incomingPending ?? [];
  const outgoingPending: FriendConnectionItem[] =
    overview?.outgoingPending ?? [];
  const blockedUsers: FriendConnectionItem[] = overview?.blocked ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className="fixed inset-0 bg-ink/40"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Friends and Direct Messages"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l-2 border-border bg-surface text-ink shadow-card"
      >
        <div className="flex items-center justify-between border-b-2 border-border bg-canvas px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-ink" />
            <h2 className="font-display text-base font-bold text-ink">
              Friends &amp; Study Chat
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close Friends & Chat drawer"
            onClick={closeDrawer}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-[1.5px] border-border bg-surface text-ink shadow-control hover:bg-canvas cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 border-b-2 border-border bg-canvas p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-sm border-[1.5px] px-3 py-1.5 font-display text-xs font-bold cursor-pointer",
              activeTab === "friends"
                ? "border-border bg-accent text-accent-ink shadow-control"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Friends</span>
            {incomingPending.length > 0 && (
              <span className="rounded-sm border border-border bg-surface px-1 font-mono text-[10px] text-ink">
                {incomingPending.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-sm border-[1.5px] px-3 py-1.5 font-display text-xs font-bold cursor-pointer",
              activeTab === "chat"
                ? "border-border bg-accent text-accent-ink shadow-control"
                : "border-transparent text-muted hover:text-ink"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "friends" ? (
            <div className="space-y-5">
              <form onSubmit={handleSearch} className="space-y-2">
                <label
                  htmlFor="social-user-search"
                  className="block font-mono text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  Find Lifters &amp; Researchers
                </label>
                <div className="flex gap-2">
                  <Input
                    id="social-user-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search display name..."
                    minLength={2}
                    maxLength={50}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={searching}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>{searching ? "..." : "Find"}</span>
                  </Button>
                </div>
              </form>

              {friendsError && (
                <p
                  role="alert"
                  className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
                >
                  {friendsError}
                </p>
              )}

              {searchResults.length > 0 && (
                <section className="space-y-2">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                    Search Results
                  </h3>
                  <div className="space-y-2">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5"
                      >
                        <Link
                          href={`/profile/${user.id}`}
                          onClick={closeDrawer}
                          className="flex min-w-0 items-center gap-2 hover:underline"
                        >
                          <UserAvatar
                            displayName={user.display_name}
                            avatarUrl={user.avatar_url}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-display text-sm font-bold text-ink">
                              {user.display_name}
                            </p>
                            <AuraBadge score={user.aura_score} />
                          </div>
                        </Link>
                        {user.friendship_state === "none" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="primary"
                            disabled={mutatingId === user.id}
                            onClick={() => void handleSendRequest(user.id)}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </Button>
                        ) : user.friendship_state === "friends" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openChatWithFriend(user)}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>Chat</span>
                          </Button>
                        ) : (
                          <Badge variant="muted">
                            {user.friendship_state === "outgoing_pending"
                              ? "Sent"
                              : "Pending"}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {overviewLoading && !overview ? (
                <p className="font-mono text-xs text-muted">
                  Loading connections...
                </p>
              ) : (
                <>
                  {incomingPending.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                        Incoming Requests ({incomingPending.length})
                      </h3>
                      <div className="space-y-2">
                        {incomingPending.map((item) => (
                          <div
                            key={item.friendship_id}
                            className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5"
                          >
                            <Link
                              href={`/profile/${item.peer.id}`}
                              onClick={closeDrawer}
                              className="flex min-w-0 items-center gap-2 hover:underline"
                            >
                              <UserAvatar
                                displayName={item.peer.display_name}
                                avatarUrl={item.peer.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-display text-sm font-bold text-ink">
                                  {item.peer.display_name}
                                </p>
                                <AuraBadge score={item.peer.aura_score} />
                              </div>
                            </Link>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                disabled={mutatingId === item.friendship_id}
                                onClick={() =>
                                  void handleRespond(
                                    item.friendship_id,
                                    "accept"
                                  )
                                }
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Accept</span>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={mutatingId === item.friendship_id}
                                onClick={() =>
                                  void handleRespond(
                                    item.friendship_id,
                                    "decline"
                                  )
                                }
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="space-y-2">
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                      Accepted Friends ({acceptedFriends.length})
                    </h3>
                    {acceptedFriends.length === 0 ? (
                      <p className="rounded-md border-2 border-border bg-canvas p-3 text-xs text-muted">
                        No friends yet. Search by display name above or add
                        contributors from their profile.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {acceptedFriends.map((item) => (
                          <div
                            key={item.friendship_id}
                            className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5"
                          >
                            <Link
                              href={`/profile/${item.peer.id}`}
                              onClick={closeDrawer}
                              className="flex min-w-0 items-center gap-2 hover:underline"
                            >
                              <UserAvatar
                                displayName={item.peer.display_name}
                                avatarUrl={item.peer.avatar_url}
                                size="sm"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-display text-sm font-bold text-ink">
                                  {item.peer.display_name}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <AuraBadge score={item.peer.aura_score} />
                                  {item.unread_count > 0 && (
                                    <span className="rounded-sm border border-border bg-accent px-1 font-mono text-[10px] font-bold text-accent-ink">
                                      {item.unread_count} new
                                    </span>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                onClick={() => openChatWithFriend(item.peer)}
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Chat</span>
                              </Button>
                              <button
                                type="button"
                                title="Unfriend"
                                aria-label={`Unfriend ${item.peer.display_name}`}
                                disabled={mutatingId === item.peer.id}
                                onClick={() => void handleUnfriend(item.peer.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-[1.5px] border-border bg-surface text-muted hover:text-ink cursor-pointer"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Block user"
                                aria-label={`Block ${item.peer.display_name}`}
                                disabled={mutatingId === item.peer.id}
                                onClick={() => void handleBlock(item.peer.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-[1.5px] border-border bg-surface text-muted hover:text-ink cursor-pointer"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {outgoingPending.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                        Sent Requests ({outgoingPending.length})
                      </h3>
                      <div className="space-y-2">
                        {outgoingPending.map((item) => (
                          <div
                            key={item.friendship_id}
                            className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5"
                          >
                            <span className="truncate font-display text-sm font-bold text-ink">
                              {item.peer.display_name}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={mutatingId === item.friendship_id}
                              onClick={() =>
                                void handleRespond(item.friendship_id, "cancel")
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {blockedUsers.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                        Blocked ({blockedUsers.length})
                      </h3>
                      <div className="space-y-2">
                        {blockedUsers.map((item) => (
                          <div
                            key={item.friendship_id}
                            className="flex items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5"
                          >
                            <span className="truncate font-display text-sm font-bold text-muted">
                              {item.peer.display_name}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={mutatingId === item.peer.id}
                              onClick={() => void handleUnblock(item.peer.id)}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                              <span>Unblock</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          ) : !activeFriend ? (
            <div className="space-y-3">
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-muted">
                Select a friend to message
              </p>
              {acceptedFriends.length === 0 ? (
                <p className="rounded-md border-2 border-border bg-canvas p-3 text-xs text-muted">
                  Only mutual accepted friends can exchange 1:1 messages and
                  study cards. Add a friend in the Friends tab first.
                </p>
              ) : (
                acceptedFriends.map((item) => (
                  <button
                    key={item.friendship_id}
                    type="button"
                    onClick={() => setActiveFriend(item.peer)}
                    className="flex w-full items-center justify-between gap-2 rounded-md border-2 border-border bg-canvas p-2.5 text-left hover:bg-surface cursor-pointer"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        displayName={item.peer.display_name}
                        avatarUrl={item.peer.avatar_url}
                        size="sm"
                      />
                      <span className="truncate font-display text-sm font-bold text-ink">
                        {item.peer.display_name}
                      </span>
                    </div>
                    {item.unread_count > 0 ? (
                      <span className="rounded-sm border border-border bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-ink">
                        {item.unread_count} unread
                      </span>
                    ) : (
                      <MessageSquare className="h-4 w-4 text-muted" />
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-border/15 pb-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Back to conversations"
                    onClick={() => setActiveFriend(null)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border-[1.5px] border-border bg-canvas text-ink hover:bg-surface cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <UserAvatar
                    displayName={activeFriend.display_name}
                    avatarUrl={activeFriend.avatar_url}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/profile/${activeFriend.id}`}
                      onClick={closeDrawer}
                      className="block truncate font-display text-sm font-bold text-ink hover:underline"
                    >
                      {activeFriend.display_name}
                    </Link>
                    <AuraBadge score={activeFriend.aura_score} />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {threadHasMore && (
                  <div className="text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loadingOlder}
                      onClick={() => void handleLoadOlder()}
                    >
                      {loadingOlder ? "Loading..." : "Load older messages"}
                    </Button>
                  </div>
                )}

                {loadingThread ? (
                  <p className="font-mono text-xs text-muted">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="rounded-md border-2 border-border bg-canvas p-3 text-xs text-muted">
                    No messages yet. Say hello or share a study with{" "}
                    {activeFriend.display_name}.
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === profile.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col gap-1",
                          isMine ? "items-end" : "items-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-md border-2 border-border p-2.5 text-sm shadow-control",
                            isMine
                              ? "bg-accent text-accent-ink"
                              : "bg-canvas text-ink"
                          )}
                        >
                          {msg.has_study_attachment && (
                            <div className="mb-1.5">
                              {msg.study ? (
                                <Link
                                  href={`/study/${msg.study.id}`}
                                  onClick={closeDrawer}
                                  className="block rounded-sm border-[1.5px] border-border bg-surface p-2 text-ink hover:bg-canvas"
                                >
                                  <div className="flex items-center justify-between gap-1 font-mono text-[10px] text-muted">
                                    <span>
                                      {msg.study.journal} &bull;{" "}
                                      {msg.study.publication_year}
                                    </span>
                                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                                  </div>
                                  <p className="mt-0.5 font-display text-xs font-bold leading-snug text-ink">
                                    {msg.study.title}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    <Badge
                                      variant={getStudyDesignBadgeVariant(
                                        msg.study.study_design
                                      )}
                                    >
                                      {formatStudyDesign(msg.study.study_design)}
                                    </Badge>
                                    <Badge variant="muted">
                                      Score {msg.study.quality_score}
                                    </Badge>
                                  </div>
                                </Link>
                              ) : (
                                <div className="rounded-sm border-[1.5px] border-border bg-surface p-2 font-mono text-xs text-muted">
                                  Referenced study is no longer available
                                </div>
                              )}
                            </div>
                          )}

                          {msg.body && (
                            <p className="whitespace-pre-wrap break-words leading-snug">
                              {msg.body}
                            </p>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-muted">
                          {formatMsgTime(msg.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {chatError && (
                <p
                  role="alert"
                  className="mt-2 rounded-md border-2 border-accent-ink bg-badge-abstract px-2.5 py-1.5 font-mono text-xs font-semibold text-accent-ink"
                >
                  {chatError}
                </p>
              )}

              <form
                onSubmit={handleSendMessage}
                className="mt-3 border-t-2 border-border/15 pt-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      aria-label={`Message ${activeFriend.display_name}`}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      maxLength={1000}
                      placeholder="Write a plain-text message..."
                      className="flex w-full rounded-md border-2 border-border bg-canvas px-2.5 py-1.5 font-sans text-sm text-ink shadow-control placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
                    />
                    <p className="mt-1 font-mono text-[10px] text-muted">
                      {draft.length}/1000
                    </p>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={sendingMsg}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{sendingMsg ? "..." : "Send"}</span>
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
