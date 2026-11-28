import { getFeedStudies } from "@/lib/queries/studies";
import { getTopAuraUsers } from "@/lib/queries/social";
import { FeedClient } from "@/components/feed/feed-client";
import { TopUsersRail } from "@/components/social/top-users-rail";

export const revalidate = 3600;

export default async function HomePage() {
  const [studies, topUsers] = await Promise.all([
    getFeedStudies(),
    getTopAuraUsers(10),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-1">
          <p className="font-pixel text-[11px] font-bold uppercase tracking-wider text-muted">
            QUEST BOARD • DAILY RESEARCH
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Daily Resistance-Training Research
          </h1>
        </div>
        <p className="font-mono text-xs text-muted">
          Primary literature • Deterministic evidence scoring
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <TopUsersRail users={topUsers} />
        <div className="min-w-0">
          <FeedClient initialStudies={studies} />
        </div>
      </div>
    </div>
  );
}
