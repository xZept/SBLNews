import Link from "next/link";
import { UserX } from "@/components/ui/pixel-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProfileNotFound() {
  return (
    <div className="mx-auto max-w-xl py-8">
      <Card className="space-y-4 p-6 sm:p-8">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border-2 border-border bg-accent text-accent-ink shadow-control">
          <UserX className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-bold text-ink">
            Profile not found
          </h1>
          <p className="text-sm text-muted">
            This community profile does not exist or the profile link is
            invalid.
          </p>
        </div>
        <div className="pt-1">
          <Button asChild variant="primary">
            <Link href="/">Main Research Feed</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
