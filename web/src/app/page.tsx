import { getFeedStudies } from "@/lib/queries/studies";
import { FeedClient } from "@/components/feed/feed-client";

export const revalidate = 3600;

export default async function HomePage() {
  const studies = await getFeedStudies();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Daily Resistance-Training Research
        </h1>
        <p className="font-mono text-xs text-muted">
          Primary literature • Deterministic evidence scoring
        </p>
      </div>

      <FeedClient initialStudies={studies} />
    </div>
  );
}
