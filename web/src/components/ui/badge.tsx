import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border-[1.5px] border-ink px-2 py-0.5 font-mono text-xs font-semibold leading-tight text-ink transition-none",
  {
    variants: {
      variant: {
        default: "bg-surface text-ink",
        accent: "bg-accent text-ink",
        meta: "bg-badge-meta text-ink",
        rct: "bg-badge-rct text-ink",
        trained: "bg-badge-trained text-ink",
        fulltext: "bg-badge-fulltext text-ink",
        abstract: "bg-badge-abstract text-ink",
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
