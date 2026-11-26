import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
} as const;

const SIZE_PIXELS = {
  sm: 32,
  md: 40,
  lg: 48,
} as const;

export interface BrandLogoProps {
  size?: keyof typeof SIZE_CLASSES;
  alt?: string;
  className?: string;
}

/**
 * Reusable Neo-Brutalist pixel-art brand emblem for SBL News.
 * Uses nearest-neighbor CSS rendering (`[image-rendering:pixelated]`) and
 * defaults to decorative (`alt=""`, `aria-hidden="true"`) when paired with
 * adjacent visible text such as "SBL News".
 */
export function BrandLogo({
  size = "sm",
  alt = "",
  className,
}: BrandLogoProps) {
  const isDecorative = alt === "";
  const px = SIZE_PIXELS[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm border-2 border-ink bg-surface shadow-[2px_2px_0px_#0F172A]",
        SIZE_CLASSES[size],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/logo.png"
        alt={alt}
        aria-hidden={isDecorative ? "true" : undefined}
        width={px}
        height={px}
        className="h-full w-full object-contain [image-rendering:pixelated]"
      />
    </span>
  );
}
