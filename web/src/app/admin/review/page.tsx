import { ShieldCheck } from "@/components/ui/pixel-icons";
import { ConsensusDriftCard } from "@/components/admin/consensus-drift-card";
import { PendingStudiesTable } from "@/components/admin/pending-studies-table";
import { SecondaryCommentaryForm } from "@/components/admin/secondary-commentary-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPendingReviewQueue } from "@/lib/queries/admin";
import { requireAdminPage } from "@/lib/supabase/admin-guard";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const { profile } = await requireAdminPage();
  const { pendingStudies, pendingAlerts, recentPublishedStudies } =
    await getPendingReviewQueue();

  return (
    <div className="space-y-8">
      <header className="space-y-1.5 border-b-2 border-border pb-4">
        <p className="font-pixel text-[11px] font-bold uppercase tracking-wider text-muted">
          GUILD MODERATION • HITL QUEUE
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Moderation &amp; Consensus Drift Queue
          </h1>
          <Badge variant="accent" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Admin: {profile.display_name}</span>
          </Badge>
        </div>
        <p className="max-w-[72ch] text-sm text-muted">
          Human-in-the-loop (HITL) governance queue. Review pending studies
          before publishing, resolve Consensus Drift alerts to update the
          Living Evidence Matrix, and attach secondary creator commentary to
          existing study threads.
        </p>
      </header>

      <section aria-labelledby="drift-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="drift-heading"
            className="font-display text-xl font-bold text-ink"
          >
            Consensus Drift Alerts
          </h2>
          <Badge variant={pendingAlerts.length > 0 ? "trained" : "muted"}>
            {pendingAlerts.length} Pending
          </Badge>
        </div>

        {pendingAlerts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="font-mono text-sm font-semibold text-ink">
              No pending Consensus Drift alerts.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingAlerts.map((alert) => (
              <ConsensusDriftCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="pending-studies-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="pending-studies-heading"
            className="font-display text-xl font-bold text-ink"
          >
            Pending Studies Queue
          </h2>
          <Badge variant={pendingStudies.length > 0 ? "rct" : "muted"}>
            {pendingStudies.length} Pending
          </Badge>
        </div>

        <PendingStudiesTable studies={pendingStudies} />
      </section>

      <section aria-labelledby="commentary-heading" className="space-y-4">
        <h2
          id="commentary-heading"
          className="font-display text-xl font-bold text-ink"
        >
          Attach Secondary Creator Commentary
        </h2>
        <SecondaryCommentaryForm studies={recentPublishedStudies} />
      </section>
    </div>
  );
}
