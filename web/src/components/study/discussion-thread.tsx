"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/profile/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createCommentAction,
  deleteCommentAction,
  updateCommentAction,
} from "@/lib/actions/comments";
import { createClient } from "@/lib/supabase/client";
import type { StudyComment } from "@/lib/queries/projections";

interface CommentNode extends StudyComment {
  replies: CommentNode[];
}

function buildCommentTree(comments: StudyComment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    map.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = map.get(comment.id)!;
    if (comment.parent_comment_id && map.has(comment.parent_comment_id)) {
      map.get(comment.parent_comment_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

interface DiscussionThreadProps {
  studyId: string;
  initialComments: StudyComment[];
  currentUserId: string | null;
}

export function DiscussionThread({
  studyId,
  initialComments,
  currentUserId,
}: DiscussionThreadProps) {
  const router = useRouter();
  const [newBody, setNewBody] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const tree = React.useMemo(
    () => buildCommentTree(initialComments),
    [initialComments]
  );

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

  async function handleCreateRootComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim() || isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);

    const res = await createCommentAction({
      studyId,
      parentCommentId: null,
      body: newBody,
    });

    setIsSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.message);
      return;
    }

    setNewBody("");
    router.refresh();
  }

  return (
    <section id="discussion" aria-labelledby="discussion-heading">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center gap-2 border-b-2 border-border/15 pb-3">
          <MessageSquare className="h-5 w-5 text-ink" />
          <h2
            id="discussion-heading"
            className="font-display text-xl font-bold text-ink"
          >
            Community Discussion ({initialComments.length})
          </h2>
        </div>

        {/* Composer or OAuth Sign-In Prompt */}
        <div className="mt-4">
          {currentUserId ? (
            <form onSubmit={handleCreateRootComment} className="space-y-2.5">
              <label
                htmlFor="root-comment-body"
                className="block font-mono text-xs font-semibold text-muted"
              >
                Add an evidence-grounded comment (max 4,000 chars)
              </label>
              <textarea
                id="root-comment-body"
                rows={3}
                maxLength={4000}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Discuss methodology, effect sizes, or practical application..."
                className="w-full rounded-md border-2 border-border bg-canvas p-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              />
              {errorMsg && (
                <p className="font-mono text-xs text-ink" role="alert">
                  {errorMsg}
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !newBody.trim()}
                >
                  {isSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border-[1.5px] border-border bg-canvas p-3.5">
              <p className="text-sm font-medium text-ink">
                Sign in to post comments or reply to threads.
              </p>
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
                >
                  GitHub
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Thread Tree */}
        <div className="mt-6 space-y-4">
          {tree.length === 0 ? (
            <p className="font-mono text-xs text-muted">
              No comments yet. Start the discussion above.
            </p>
          ) : (
            tree.map((node) => (
              <CommentItem
                key={node.id}
                node={node}
                studyId={studyId}
                currentUserId={currentUserId}
                depth={0}
              />
            ))
          )}
        </div>
      </Card>
    </section>
  );
}

interface CommentItemProps {
  node: CommentNode;
  studyId: string;
  currentUserId: string | null;
  depth: number;
}

function CommentItem({
  node,
  studyId,
  currentUserId,
  depth,
}: CommentItemProps) {
  const router = useRouter();
  const [isReplying, setIsReplying] = React.useState(false);
  const [replyBody, setReplyBody] = React.useState("");
  const [isEditing, setIsEditing] = React.useState(false);
  const [editBody, setEditBody] = React.useState(node.body);
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const isOwner = currentUserId !== null && currentUserId === node.author_id;
  const authorName = node.author?.display_name ?? "Lifter";

  async function handleReplySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || busy) return;
    setActionError(null);
    setBusy(true);

    const res = await createCommentAction({
      studyId,
      parentCommentId: node.id,
      body: replyBody,
    });

    setBusy(false);
    if (!res.ok) {
      setActionError(res.message);
      return;
    }

    setReplyBody("");
    setIsReplying(false);
    router.refresh();
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editBody.trim() || busy) return;
    setActionError(null);
    setBusy(true);

    const res = await updateCommentAction({
      commentId: node.id,
      body: editBody,
    });

    setBusy(false);
    if (!res.ok) {
      setActionError(res.message);
      return;
    }

    setIsEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (busy) return;
    setActionError(null);
    setBusy(true);

    const res = await deleteCommentAction({ commentId: node.id });
    setBusy(false);
    if (!res.ok) {
      setActionError(res.message);
      return;
    }
    router.refresh();
  }

  return (
    <div
      className={
        depth > 0 ? "mt-3 border-l-2 border-border/30 pl-4" : ""
      }
    >
      <div className="rounded-sm border-[1.5px] border-border bg-canvas p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
          {node.is_deleted ? (
            <span className="font-bold text-ink">[deleted]</span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/profile/${node.author_id}`}
                className="inline-flex items-center gap-2 font-bold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              >
                <UserAvatar
                  displayName={authorName}
                  avatarUrl={node.author?.avatar_url}
                  size="sm"
                />
                <span>{authorName}</span>
              </Link>
              {node.author?.affiliation_role && (
                <Badge variant="muted">{node.author.affiliation_role}</Badge>
              )}
            </div>
          )}
          <span>{new Date(node.created_at).toLocaleDateString()}</span>
        </div>

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="mt-2 space-y-2">
            <textarea
              rows={3}
              maxLength={4000}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-border bg-surface p-2.5 text-sm text-ink"
            />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" disabled={busy}>
                Save
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setEditBody(node.body);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p
            className={`mt-2 max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed ${
              node.is_deleted ? "font-mono italic text-muted" : "text-ink"
            }`}
          >
            {node.is_deleted ? "[deleted]" : node.body}
          </p>
        )}

        {actionError && (
          <p className="mt-1.5 font-mono text-xs text-ink" role="alert">
            {actionError}
          </p>
        )}

        {!node.is_deleted && (
          <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-xs">
            {currentUserId && (
              <button
                type="button"
                onClick={() => setIsReplying((prev) => !prev)}
                className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink cursor-pointer"
              >
                <Reply className="h-3.5 w-3.5" />
                <span>Reply</span>
              </button>
            )}

            {isOwner && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="inline-flex items-center gap-1 font-semibold text-muted hover:text-ink cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}

        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
            <textarea
              rows={2}
              maxLength={4000}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder={`Reply to ${authorName}...`}
              className="w-full rounded-sm border-[1.5px] border-border bg-surface p-2.5 text-sm text-ink"
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={busy || !replyBody.trim()}
              >
                {busy ? "Replying..." : "Post Reply"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsReplying(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {node.replies.length > 0 && (
        <div className="space-y-2">
          {node.replies.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              studyId={studyId}
              currentUserId={currentUserId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
