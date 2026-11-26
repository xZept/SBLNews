import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border-[1.5px] border-border px-2 py-0.5 font-mono text-xs font-semibold leading-tight text-ink transition-none",
  {
    variants: {
      variant: {
        default: "bg-surface text-ink",
        accent: "bg-accent text-accent-ink",
        meta: "bg-badge-meta text-accent-ink",
        rct: "bg-badge-rct text-accent-ink",
        trained: "bg-badge-trained text-accent-ink",
        fulltext: "bg-badge-fulltext text-accent-ink",
        abstract: "bg-badge-abstract text-accent-ink",
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
