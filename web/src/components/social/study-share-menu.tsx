"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Send,
  Share2,
  Users,
  X,
} from "@/components/ui/pixel-icons";
import { useAccountProfile } from "@/components/layout/account-profile-provider";
import { useSocialDrawer } from "@/components/layout/social-drawer-provider";
import {
  recordStudyShareAction,
  sendStudyToFriendAction,
} from "@/lib/actions/social";
import type { ShareChannelType } from "@/lib/queries/projections";
import { SendStudyToFriendSchema } from "@/lib/validations/social";
import {
  buildExternalShareUrls,
  formatDiscordShareMarkdown,
  formatStudyCitation,
  type ShareableStudy,
} from "@/lib/share-links";

interface StudyShareMenuProps {
  study: ShareableStudy;
  variant?: "card" | "detail";
}

export function StudyShareMenu({
  study,
  variant = "card",
}: StudyShareMenuProps) {
  const { profile, loading: authLoading } = useAccountProfile();
  const {
    overview,
    overviewLoading,
    refreshOverview,
    openDrawer,
    openChatWithFriend,
  } = useSocialDrawer();
  const [open, setOpen] = React.useState(false);
  const [copiedType, setCopiedType] = React.useState<
    "citation" | "discord" | null
  >(null);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [canNativeShare, setCanNativeShare] = React.useState(false);
  const [selectedFriendId, setSelectedFriendId] = React.useState("");
  const [friendNote, setFriendNote] = React.useState("");
  const [sendingFriend, setSendingFriend] = React.useState(false);
  const [friendSendError, setFriendSendError] = React.useState<string | null>(
    null
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const copyTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  React.useEffect(() => {
    if (open && profile && !overview && !overviewLoading) {
      void refreshOverview();
    }
  }, [open, profile, overview, overviewLoading, refreshOverview]);

  const acceptedFriends = React.useMemo(
    () => overview?.accepted ?? [],
    [overview]
  );

  React.useEffect(() => {
    if (!selectedFriendId && acceptedFriends.length > 0) {
      setSelectedFriendId(acceptedFriends[0].peer.id);
    }
  }, [acceptedFriends, selectedFriendId]);

  async function handleSendToFriend(event: React.FormEvent) {
    event.preventDefault();
    if (sendingFriend || !selectedFriendId) return;
    setFriendSendError(null);

    const parsed = SendStudyToFriendSchema.safeParse({
      recipientId: selectedFriendId,
      studyId: study.id,
      note: friendNote,
    });
    if (!parsed.success) {
      setFriendSendError(
        parsed.error.issues[0]?.message ?? "Check your friend and note."
      );
      return;
    }

    setSendingFriend(true);
    try {
      const res = await sendStudyToFriendAction({
        recipientId: parsed.data.recipientId,
        studyId: parsed.data.studyId,
        note: parsed.data.note,
      });
      if (!res.ok) {
        setFriendSendError(res.message);
        return;
      }

      const targetFriend = acceptedFriends.find(
        (f) => f.peer.id === parsed.data.recipientId
      )?.peer;
      setFriendNote("");
      setOpen(false);
      if (targetFriend) {
        openChatWithFriend(targetFriend);
      }
    } catch {
      setFriendSendError("Failed to send study to friend.");
    } finally {
      setSendingFriend(false);
    }
  }

  const { canonicalUrl, xUrl, redditUrl, whatsappUrl } = React.useMemo(
    () => buildExternalShareUrls(study),
    [study]
  );

  function trackShare(channel: ShareChannelType) {
    void recordStudyShareAction({
      studyId: study.id,
      channel,
    });
  }

  async function copyToClipboard(
    text: string,
    type: "citation" | "discord",
    channel: ShareChannelType
  ) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      trackShare(channel);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedType(null);
      }, 2200);
    } catch {
      setCopyError("Clipboard access unavailable. Copy the URL manually.");
    }
  }

  async function handleNativeShare() {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({
        title: `${study.title} — SBL News`,
        text: formatStudyCitation(study),
        url: canonicalUrl,
      });
      trackShare("web_share");
      setOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
    }
  }

  const triggerClassName =
    variant === "detail"
      ? "inline-flex items-center gap-2 rounded-md border-2 border-border bg-surface px-4 py-2 font-display text-sm font-bold text-ink shadow-control transition-transform hover:bg-canvas active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
      : "inline-flex items-center gap-1.5 text-ink hover:underline cursor-pointer";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Share or send ${study.title}`}
        onClick={() => setOpen((prev) => !prev)}
        className={triggerClassName}
      >
        <Share2 className={variant === "detail" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        <span>Share / Send</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Share study options"
          className="absolute left-0 z-30 mt-2 w-[min(19rem,calc(100vw-3rem))] rounded-md border-2 border-border bg-surface p-3 text-ink shadow-card"
        >
          <div className="flex items-center justify-between border-b border-border/15 pb-2">
            <span className="font-display text-xs font-bold uppercase tracking-wide text-muted">
              Share Study
            </span>
            <button
              type="button"
              aria-label="Close share menu"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="rounded-sm p-0.5 text-muted hover:bg-canvas hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() =>
                void copyToClipboard(
                  formatStudyCitation(study),
                  "citation",
                  "copy_citation"
                )
              }
              className="flex w-full items-center justify-between rounded-sm border-[1.5px] border-border bg-accent px-2.5 py-1.5 font-mono text-xs font-semibold text-accent-ink shadow-control transition-transform active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                {copiedType === "citation" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>
                  {copiedType === "citation"
                    ? "Copied Link + Citation!"
                    : "Copy Link + Citation"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                void copyToClipboard(
                  formatDiscordShareMarkdown(study),
                  "discord",
                  "discord"
                )
              }
              className="flex w-full items-center justify-between rounded-sm border-[1.5px] border-border bg-canvas px-2.5 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-surface cursor-pointer"
            >
              <span className="inline-flex items-center gap-1.5">
                {copiedType === "discord" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5" />
                )}
                <span>
                  {copiedType === "discord"
                    ? "Copied for Discord!"
                    : "Discord (Copy Markdown)"}
                </span>
              </span>
            </button>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5 font-mono text-[11px] font-semibold">
              <a
                href={xUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare("x")}
                className="inline-flex items-center justify-center gap-1 rounded-sm border-[1.5px] border-border bg-canvas px-2 py-1.5 text-ink hover:bg-surface"
              >
                <span>X</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href={redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare("reddit")}
                className="inline-flex items-center justify-center gap-1 rounded-sm border-[1.5px] border-border bg-canvas px-2 py-1.5 text-ink hover:bg-surface"
              >
                <span>Reddit</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackShare("whatsapp")}
                className="inline-flex items-center justify-center gap-1 rounded-sm border-[1.5px] border-border bg-canvas px-2 py-1.5 text-ink hover:bg-surface"
              >
                <span>WhatsApp</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {canNativeShare && (
              <button
                type="button"
                onClick={() => void handleNativeShare()}
                className="flex w-full items-center justify-center gap-1.5 rounded-sm border-[1.5px] border-border bg-canvas px-2.5 py-1.5 font-mono text-xs font-semibold text-ink hover:bg-surface cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>More Share Options…</span>
              </button>
            )}

            {copyError && (
              <p className="font-mono text-[11px] text-muted" role="status">
                {copyError}
              </p>
            )}
          </div>

          <div className="mt-3 border-t-2 border-border/15 pt-2.5">
            <div className="flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-muted">
              <Users className="h-3.5 w-3.5" />
              <span>Send to Friend</span>
            </div>

            {!authLoading && !profile ? (
              <p className="mt-1.5 rounded-sm border-[1.5px] border-border bg-canvas px-2.5 py-2 text-xs text-muted">
                <Link
                  href="/profile"
                  className="font-semibold text-ink underline"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </Link>{" "}
                to send studies directly to friends on SBL News.
              </p>
            ) : overviewLoading && !overview ? (
              <p className="mt-1.5 font-mono text-[11px] text-muted">
                Loading friends...
              </p>
            ) : acceptedFriends.length === 0 ? (
              <div className="mt-1.5 space-y-2 rounded-sm border-[1.5px] border-border bg-canvas px-2.5 py-2 text-xs text-muted">
                <p>No accepted friends yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openDrawer("friends");
                  }}
                  className="font-mono text-[11px] font-semibold text-ink underline cursor-pointer"
                >
                  Find friends in Drawer
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSendToFriend}
                className="mt-2 space-y-2"
              >
                <select
                  aria-label="Select friend"
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  className="flex h-8 w-full rounded-sm border-[1.5px] border-border bg-canvas px-2 font-sans text-xs text-ink"
                >
                  {acceptedFriends.map((f) => (
                    <option key={f.peer.id} value={f.peer.id}>
                      {f.peer.display_name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  aria-label="Optional note"
                  value={friendNote}
                  onChange={(e) => setFriendNote(e.target.value)}
                  maxLength={240}
                  placeholder="Optional note (<= 240 chars)..."
                  className="flex h-8 w-full rounded-sm border-[1.5px] border-border bg-canvas px-2 font-sans text-xs text-ink placeholder:text-muted"
                />
                {friendSendError && (
                  <p
                    role="alert"
                    className="font-mono text-[11px] font-semibold text-accent-ink"
                  >
                    {friendSendError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sendingFriend}
                  className="flex w-full items-center justify-center gap-1.5 rounded-sm border-[1.5px] border-border bg-accent px-2.5 py-1.5 font-mono text-xs font-semibold text-accent-ink shadow-control cursor-pointer disabled:opacity-60"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingFriend ? "Sending..." : "Send Study"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
