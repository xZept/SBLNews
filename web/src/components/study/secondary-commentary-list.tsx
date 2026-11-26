import { ExternalLink, MessageCircleWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { SecondaryCommentary } from "@/lib/queries/projections";

interface SecondaryCommentaryListProps {
  commentaries: SecondaryCommentary[];
}

export function SecondaryCommentaryList({
  commentaries,
}: SecondaryCommentaryListProps) {
  return (
    <section aria-labelledby="secondary-commentary-heading">
      <Card className="bg-canvas p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-border/15 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircleWarning className="h-4 w-4 text-muted" />
            <h2
              id="secondary-commentary-heading"
              className="font-display text-base font-bold text-ink"
            >
              Secondary Creator Commentary
            </h2>
          </div>
          <Badge variant="muted">Non-Peer-Reviewed Context</Badge>
        </div>

        <p className="mt-2.5 max-w-[70ch] text-xs text-muted">
          External creator videos, podcasts, and social threads are attached strictly as secondary commentary and are separated from the primary peer-reviewed record above.
        </p>

        {commentaries.length === 0 ? (
          <p className="mt-3 font-mono text-xs text-muted">
            No secondary creator commentary linked to this study yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {commentaries.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-sm border-[1.5px] border-border bg-surface px-3.5 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{item.platform}</Badge>
                    <span className="font-mono text-xs font-semibold text-muted">
                      {item.creator_name}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink">
                    {item.title}
                  </p>
                </div>

                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border-[1.5px] border-border bg-canvas px-2.5 py-1 font-mono text-xs font-semibold text-ink hover:bg-accent hover:text-accent-ink"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
