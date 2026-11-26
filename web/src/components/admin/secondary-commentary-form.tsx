"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { addSecondaryCommentaryAction } from "@/lib/actions/moderation";
import type { StudyOptionItem } from "@/lib/queries/admin";
import type { CommentaryPlatformType } from "@/lib/queries/projections";

interface SecondaryCommentaryFormProps {
  studies: StudyOptionItem[];
}

export function SecondaryCommentaryForm({
  studies,
}: SecondaryCommentaryFormProps) {
  const [studyId, setStudyId] = useState(studies[0]?.id ?? "");
  const [platform, setPlatform] =
    useState<CommentaryPlatformType>("YouTube");
  const [creatorName, setCreatorName] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setErrorMsg(null);

    startTransition(async () => {
      const result = await addSecondaryCommentaryAction({
        studyId,
        platform,
        creatorName,
        title,
        url,
      });

      if (!result.ok) {
        setErrorMsg(result.message);
        return;
      }

      setFeedback(result.message);
      setCreatorName("");
      setTitle("");
      setUrl("");
    });
  }

  return (
    <Card className="p-4 sm:p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="commentary-study"
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              Target Published Study
            </label>
            {studies.length > 0 ? (
              <select
                id="commentary-study"
                value={studyId}
                onChange={(e) => setStudyId(e.target.value)}
                className="flex h-10 w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-sans text-sm text-ink shadow-control"
              >
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title.slice(0, 75)} ({s.publication_year})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id="commentary-study"
                value={studyId}
                onChange={(e) => setStudyId(e.target.value)}
                placeholder="Study UUID"
                required
              />
            )}
          </div>

          <div className="space-y-1">
            <label
              htmlFor="commentary-platform"
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              Platform
            </label>
            <select
              id="commentary-platform"
              value={platform}
              onChange={(e) =>
                setPlatform(e.target.value as CommentaryPlatformType)
              }
              className="flex h-10 w-full rounded-md border-2 border-border bg-surface px-3 py-2 font-sans text-sm text-ink shadow-control"
            >
              <option value="YouTube">YouTube</option>
              <option value="Podcast">Podcast</option>
              <option value="Article">Article</option>
              <option value="Social">Social</option>
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="commentary-creator"
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              Creator / Channel Name
            </label>
            <Input
              id="commentary-creator"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g., Stronger By Science"
              required
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="commentary-url"
              className="block font-mono text-xs font-semibold uppercase text-muted"
            >
              External URL
            </label>
            <Input
              id="commentary-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="commentary-title"
            className="block font-mono text-xs font-semibold uppercase text-muted"
          >
            Commentary Title
          </label>
          <Input
            id="commentary-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Video or episode title..."
            required
          />
        </div>

        {feedback && (
          <p
            role="status"
            className="rounded-md border-2 border-accent-ink bg-badge-fulltext px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
          >
            {feedback}
          </p>
        )}
        {errorMsg && (
          <p
            role="alert"
            className="rounded-md border-2 border-accent-ink bg-badge-abstract px-3 py-2 font-mono text-xs font-semibold text-accent-ink"
          >
            {errorMsg}
          </p>
        )}

        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          <Plus className="h-3.5 w-3.5" />
          <span>Attach Secondary Commentary</span>
        </Button>
      </form>
    </Card>
  );
}
