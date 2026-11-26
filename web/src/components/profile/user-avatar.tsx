import { deriveInitials } from "@/lib/initials";
import { cn } from "@/lib/utils";

export interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-16 w-16 text-lg",
};

export function UserAvatar({
  displayName,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = deriveInitials(displayName);
  const sizeClass = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-border bg-surface shadow-control",
          sizeClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl}
          alt={`${displayName} avatar`}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      aria-label={displayName}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-md border-2 border-border bg-accent font-mono font-bold text-accent-ink shadow-control",
        sizeClass,
        className
      )}
    >
      {initials}
    </span>
  );
}
