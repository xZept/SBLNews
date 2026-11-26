"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, MessageSquare, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  loadMoreCommentHistoryAction,
  loadMoreUpvotedStudiesAction,
} from "@/lib/actions/profile";
import type {
  CursorPage,
  ProfileCommentHistoryItem,
  ProfileUpvotedStudyItem,
} from "@/lib/queries/projections";
import type { CommentHistoryPageCursor } from "@/lib/queries/profile";
import {
  formatStudyDesign,
  getStudyDesignBadgeVariant,
} from "@/lib/queries/study-badges";
import type { UpvotedStudiesCursor } from "@/lib/validations/profile";

interface ProfileActivityListsProps {
  userId: string;
  mode?: "private" | "public";
  initialComments: CursorPage<
    ProfileCommentHistoryItem,
    CommentHistoryPageCursor
  >;
  initialUpvotes?: CursorPage<ProfileUpvotedStudyItem, UpvotedStudiesCursor>;
}

function formatActivityDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ProfileActivityLists({
  userId,
  mode = "private",
  initialComments,
  initialUpvotes,
}: ProfileActivityListsProps) {
  const [comments, setComments] = React.useState(initialComments.items);
  const [commentsCursor, setCommentsCursor] = React.useState(
    initialComments.nextCursor
  );
  const [commentsHasMore, setCommentsHasMore] = React.useState(
    initialComments.hasMore
  );
  const [loadingComments, setLoadingComments] = React.useState(false);
  const [commentsError, setCommentsError] = React.useState<string | null>(null);

  const [upvotes, setUpvotes] = React.useState(initialUpvotes?.items ?? []);
  const [upvotesCursor, setUpvotesCursor] = React.useState(
    initialUpvotes?.nextCursor ?? null
  );
  const [upvotesHasMore, setUpvotesHasMore] = React.useState(
    initialUpvotes?.hasMore ?? false
  );
  const [loadingUpvotes, setLoadingUpvotes] = React.useState(false);
  const [upvotesError, setUpvotesError] = React.useState<string | null>(null);

  async function handleLoadMoreComments() {
    if (!commentsCursor || loadingComments) return;
    setLoadingComments(true);
    setCommentsError(null);

    try {
      const result = await loadMoreCommentHistoryAction({
        userId,
        cursorCreatedAt: commentsCursor.cursorCreatedAt,
        cursorCommentId: commentsCursor.cursorCommentId,
      });
      if (!result.ok) {
        setCommentsError(result.message);
        return;
      }

      setComments((prev) => [...prev, ...result.page.items]);
      setCommentsCursor(result.page.nextCursor);
      setCommentsHasMore(result.page.hasMore);
    } catch {
      setCommentsError("Failed to load more comments.");
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleLoadMoreUpvotes() {
    if (!upvotesCursor || loadingUpvotes) return;
    setLoadingUpvotes(true);
    setUpvotesError(null);

    try {
      const result = await loadMoreUpvotedStudiesAction(upvotesCursor);
      if (!result.ok) {
        setUpvotesError(result.message);
        return;
      }

      setUpvotes((prev) => [...prev, ...result.page.items]);
      setUpvotesCursor(result.page.nextCursor);
      setUpvotesHasMore(result.page.hasMore);
    } catch {
      setUpvotesError("Failed to load more upvoted studies.");
    } finally {
      setLoadingUpvotes(false);
    }
  }

  const commentListContent = (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="font-display text-base font-bold text-ink">
            No comments yet
          </p>
          <p className="mt-1 text-sm text-muted">
            {mode === "private"
              ? "Your study discussion comments will appear here once you join a thread."
              : "This community member has not posted any public comments yet."}
          </p>
        </Card>
      ) : (
        comments.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
              <span>
                {item.study.journal} &bull; {item.study.publication_year}
              </span>
              <time dateTime={item.created_at}>
                {formatActivityDate(item.created_at)}
              </time>
            </div>
            <h3 className="mt-1 font-display text-base font-bold leading-snug text-ink">
              <Link
                href={`/study/${item.study_id}#discussion`}
                className="inline-flex items-baseline gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
              >
                <span>{item.study.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
              </Link>
            </h3>
            <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink">
              {item.body_excerpt}
            </p>
          </Card>
        ))
      )}

      {commentsError && (
        <p
          role="alert"
          className="font-mono text-xs font-semibold text-red-600 dark:text-red-400"
        >
          {commentsError}
        </p>
      )}

      {commentsHasMore && (
        <div className="pt-2">
          <Button
            type="button"
            variant="secondary"
            disabled={loadingComments}
            onClick={() => void handleLoadMoreComments()}
          >
            {loadingComments ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );

  if (mode === "public") {
    return (
      <section aria-label="Public comment history" className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-ink" />
          <h2 className="font-display text-lg font-bold text-ink">
            Comment History
          </h2>
        </div>
        {commentListContent}
      </section>
    );
  }

  return (
    <section aria-label="Personal activity" className="space-y-4">
      <Tabs defaultValue="upvotes">
        <TabsList>
          <TabsTrigger value="upvotes" className="gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>Upvoted Studies</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comment History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upvotes">
          <div className="space-y-3">
            {upvotes.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="font-display text-base font-bold text-ink">
                  No upvoted studies yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Upvote studies in the research feed to bookmark them here.
                </p>
                <div className="mt-4">
                  <Button asChild variant="primary" size="sm">
                    <Link href="/">Browse Research Feed</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              upvotes.map((item) => (
                <Card key={item.study_id} className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
                    <span>
                      {item.study.journal} &bull; {item.study.publication_year}
                    </span>
                    <time dateTime={item.voted_at}>
                      Upvoted {formatActivityDate(item.voted_at)}
                    </time>
                  </div>
                  <h3 className="mt-1 font-display text-base font-bold leading-snug text-ink">
                    <Link
                      href={`/study/${item.study_id}`}
                      className="inline-flex items-baseline gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
                    >
                      <span>{item.study.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
                    </Link>
                  </h3>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={getStudyDesignBadgeVariant(
                        item.study.study_design
                      )}
                    >
                      {formatStudyDesign(item.study.study_design)}
                    </Badge>
                    <Badge variant="muted">
                      Score {item.study.quality_score}
                    </Badge>
                  </div>
                </Card>
              ))
            )}

            {upvotesError && (
              <p
                role="alert"
                className="font-mono text-xs font-semibold text-red-600 dark:text-red-400"
              >
                {upvotesError}
              </p>
            )}

            {upvotesHasMore && (
              <div className="pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingUpvotes}
                  onClick={() => void handleLoadMoreUpvotes()}
                >
                  {loadingUpvotes ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">{commentListContent}</TabsContent>
      </Tabs>
    </section>
  );
}
