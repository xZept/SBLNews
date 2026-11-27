import { cn } from "@/lib/utils";

export interface AuraBadgeProps {
  score: number;
  variant?: "accent" | "surface";
  className?: string;
}

/**
 * Neo-Brutalist JetBrains Mono Aura badge (`${score} AURA`).
 */
export function AuraBadge({
  score,
  variant = "accent",
  className,
}: AuraBadgeProps) {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm border-[1.5px] border-border px-2 py-0.5 font-mono text-xs font-bold leading-tight whitespace-nowrap",
        variant === "accent"
          ? "bg-accent text-accent-ink"
          : "bg-canvas text-ink",
        className
      )}
    >
      {safeScore} AURA
    </span>
  );
}
