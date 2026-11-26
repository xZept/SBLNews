import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border-[1.5px] border-border px-2 py-0.5 font-mono text-xs font-semibold leading-tight text-ink transition-none",
  {
    variants: {
      variant: {
        default: "bg-surface text-ink",
        accent: "border-accent-ink bg-accent text-accent-ink",
        meta: "border-accent-ink bg-badge-meta text-accent-ink",
        rct: "border-accent-ink bg-badge-rct text-accent-ink",
        trained: "border-accent-ink bg-badge-trained text-accent-ink",
        fulltext: "border-accent-ink bg-badge-fulltext text-accent-ink",
        abstract: "border-accent-ink bg-badge-abstract text-accent-ink",
        muted: "bg-canvas text-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
