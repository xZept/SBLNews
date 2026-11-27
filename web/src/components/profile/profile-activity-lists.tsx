"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  clearRecentStudyViewsAction,
  loadMoreCommentHistoryAction,
  loadMorePublicUpvotesAction,
  loadMoreUpvotedStudiesAction,
} from "@/lib/actions/profile";
import type {
  ActivityVisibilityType,
  CursorPage,
  ProfileCommentHistoryItem,
  ProfileRecentViewItem,
  ProfileUpvotedStudyItem,
  StudyDesignType,
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
  initialRecentViews?: ProfileRecentViewItem[];
  canViewUpvotes?: boolean;
  canViewRecentViews?: boolean;
  viewedStudiesVisibility?: ActivityVisibilityType;
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

function StudyActivityCard({
  studyId,
  timestampLabel,
  timestampIso,
  study,
}: {
  studyId: string;
  timestampLabel: string;
  timestampIso: string;
  study: {
    title: string;
    journal: string;
    publication_year: number;
    study_design: StudyDesignType;
    quality_score: number;
  };
}) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted">
        <span>
          {study.journal} &bull; {study.publication_year}
        </span>
        <time dateTime={timestampIso}>
          {timestampLabel} {formatActivityDate(timestampIso)}
        </time>
      </div>
      <h3 className="mt-1 font-display text-base font-bold leading-snug text-ink">
        <Link
          href={`/study/${studyId}`}
          className="inline-flex items-baseline gap-1 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border"
        >
          <span>{study.title}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 translate-y-0.5" />
        </Link>
      </h3>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <Badge variant={getStudyDesignBadgeVariant(study.study_design)}>
          {formatStudyDesign(study.study_design)}
        </Badge>
        <Badge variant="muted">Score {study.quality_score}</Badge>
      </div>
    </Card>
  );
}

export function ProfileActivityLists({
  userId,
  mode = "private",
  initialComments,
  initialUpvotes,
  initialRecentViews = [],
  canViewUpvotes = false,
  canViewRecentViews = false,
  viewedStudiesVisibility = "private",
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

  const [recentViews, setRecentViews] =
    React.useState<ProfileRecentViewItem[]>(initialRecentViews);
  const [clearingHistory, setClearingHistory] = React.useState(false);
  const [recentViewsError, setRecentViewsError] = React.useState<string | null>(
    null
  );

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
      const result =
        mode === "public"
          ? await loadMorePublicUpvotesAction({
              userId,
              cursorVotedAt: upvotesCursor.cursorVotedAt,
              cursorStudyId: upvotesCursor.cursorStudyId,
            })
          : await loadMoreUpvotedStudiesAction(upvotesCursor);
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

  async function handleClearHistory() {
    if (clearingHistory) return;
    setClearingHistory(true);
    setRecentViewsError(null);

    try {
      const result = await clearRecentStudyViewsAction();
      if (!result.ok) {
        setRecentViewsError(result.message);
        return;
      }
      setRecentViews([]);
    } catch {
      setRecentViewsError("Failed to clear recently viewed studies.");
    } finally {
      setClearingHistory(false);
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
          className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
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

  const upvotesListContent = (
    <div className="space-y-3">
      {upvotes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="font-display text-base font-bold text-ink">
            No upvoted studies yet
          </p>
          <p className="mt-1 text-sm text-muted">
            {mode === "private"
              ? "Upvote studies in the research feed to bookmark them here."
              : "This community member has not upvoted any studies yet."}
          </p>
          {mode === "private" && (
            <div className="mt-4">
              <Button asChild variant="primary" size="sm">
                <Link href="/">Browse Research Feed</Link>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        upvotes.map((item) => (
          <StudyActivityCard
            key={item.study_id}
            studyId={item.study_id}
            timestampLabel="Upvoted"
            timestampIso={item.voted_at}
            study={item.study}
          />
        ))
      )}

      {upvotesError && (
        <p
          role="alert"
          className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
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
  );

  const recentViewsContent = (
    <div className="space-y-3">
      {mode === "private" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs text-muted">
            {recentViews.length} / 20 saved{" "}
            {viewedStudiesVisibility === "private"
              ? "(tracking paused — visibility is Private)"
              : `(visible to ${viewedStudiesVisibility === "friends" ? "Friends Only" : "Public"})`}
          </p>
          {recentViews.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={clearingHistory}
              onClick={() => void handleClearHistory()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{clearingHistory ? "Clearing..." : "Clear History"}</span>
            </Button>
          )}
        </div>
      )}

      {recentViewsError && (
        <p
          role="alert"
          className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
        >
          {recentViewsError}
        </p>
      )}

      {recentViews.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="font-display text-base font-bold text-ink">
            No recently viewed studies yet
          </p>
          <p className="mt-1 text-sm text-muted">
            {mode === "private"
              ? "Study views are only recorded when Recently Viewed Studies visibility is set to Friends Only or Public."
              : "This community member has no recently viewed studies recorded."}
          </p>
        </Card>
      ) : (
        recentViews.map((item) => (
          <StudyActivityCard
            key={item.study_id}
            studyId={item.study_id}
            timestampLabel="Viewed"
            timestampIso={item.viewed_at}
            study={item.study}
          />
        ))
      )}
    </div>
  );

  if (mode === "public") {
    const showTabs = canViewUpvotes || canViewRecentViews;
    if (!showTabs) {
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
      <section aria-label="Public activity" className="space-y-4">
        <Tabs defaultValue="comments">
          <TabsList className="flex-wrap">
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Comment History</span>
            </TabsTrigger>
            {canViewUpvotes && (
              <TabsTrigger value="upvotes" className="gap-1.5">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>Upvoted Studies</span>
              </TabsTrigger>
            )}
            {canViewRecentViews && (
              <TabsTrigger value="recent" className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span>Recently Viewed</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="comments">{commentListContent}</TabsContent>
          {canViewUpvotes && (
            <TabsContent value="upvotes">{upvotesListContent}</TabsContent>
          )}
          {canViewRecentViews && (
            <TabsContent value="recent">{recentViewsContent}</TabsContent>
          )}
        </Tabs>
      </section>
    );
  }

  return (
    <section aria-label="Personal activity" className="space-y-4">
      <Tabs defaultValue="upvotes">
        <TabsList className="flex-wrap">
          <TabsTrigger value="upvotes" className="gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5" />
            <span>Upvoted Studies</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            <span>Recently Viewed Studies</span>
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Comment History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upvotes">{upvotesListContent}</TabsContent>
        <TabsContent value="recent">{recentViewsContent}</TabsContent>
        <TabsContent value="comments">{commentListContent}</TabsContent>
      </Tabs>
    </section>
  );
}
