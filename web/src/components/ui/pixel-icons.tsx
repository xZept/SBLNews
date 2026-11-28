import * as React from "react";
import { cn } from "@/lib/utils";

export type PixelIconProps = React.SVGProps<SVGSVGElement>;

function createPixelIcon(
  displayName: string,
  paths: React.ReactNode,
  defaultClassName?: string
) {
  const Icon = React.forwardRef<SVGSVGElement, PixelIconProps>(
    ({ className, ...props }, ref) => (
      <svg
        ref={ref}
        viewBox="0 0 16 16"
        width="16"
        height="16"
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden="true"
        className={cn("inline-block shrink-0", defaultClassName, className)}
        {...props}
      >
        {paths}
      </svg>
    )
  );
  Icon.displayName = displayName;
  return Icon;
}

export const Search = createPixelIcon(
  "Search",
  <path d="M5 2h4v1H5V2zm-2 1h2v1H3V3zm6 0h2v1H9V3zM2 4h1v5H2V4zm9 0h1v5h-1V4zM3 9h2v1H3V9zm6 0h2v1H9V9zm-4 1h4v1H5v-1zm6 0h2v2h-2v-2zm2 2h2v2h-2v-2z" />,
  "lucide-search"
);

export const Sparkles = createPixelIcon(
  "Sparkles",
  <path d="M7 1h2v3H7V1zM6 4h4v2H6V4zM2 7h12v2H2V7zm4 3h4v2H6v-2zm1 3h2v2H7v-2zM2 2h2v2H2V2zm10 0h2v2h-2V2zm0 10h2v2h-2v-2zM2 12h2v2H2v-2z" />,
  "lucide-sparkles"
);

export const AlertTriangle = createPixelIcon(
  "AlertTriangle",
  <path d="M7 2h2v2H7V2zM5 4h2v2H5V4zm4 0h2v2H9V4zM4 6h2v2H4V6zm6 0h2v2h-2V6zM3 8h2v2H3V8zm8 0h2v2h-2V8zM2 10h2v2H2v-2zm10 0h2v2h-2v-2zM1 12h14v2H1v-2zM7 6h2v4H7V6zm0 5h2v1H7v-1z" />
);

export const RotateCcw = createPixelIcon(
  "RotateCcw",
  <path d="M6 2h5v2H6V2zM4 4h2v2H4V4zm7 0h2v2h-2V4zM2 2h2v5H2V2zm2 3h3v2H4V5zm8 1h2v4h-2V6zm-1 4h2v2h-2v-2zm-5 2h5v2H6v-2zm-2-2h2v2H4v-2z" />
);

export const ArrowBigUp = createPixelIcon(
  "ArrowBigUp",
  <path d="M7 2h2v2H7V2zM5 4h6v2H5V4zM3 6h10v2H3V6zM2 8h12v1H2V8zm4 1h4v5H6V9z" />
);

export const MessageSquare = createPixelIcon(
  "MessageSquare",
  <path d="M2 2h12v2H2V2zM1 4h2v7H1V4zm12 0h2v7h-2V4zM2 11h4v2H2v-2zm6 0h6v2H8v-2zm-4 2h3v2H4v-2zM4 6h8v1H4V6zm0 2h6v1H4V8z" />
);

export const ExternalLink = createPixelIcon(
  "ExternalLink",
  <path d="M9 2h5v5h-2V5H9V2zm1 4h2v2h-2V6zM8 8h2v2H8V8zM6 10h2v2H6v-2zM2 4h5v2H4v7h7v-3h2v5H2V4z" />
);

export const BookOpen = createPixelIcon(
  "BookOpen",
  <path d="M2 3h5v2H2V3zm7 0h5v2H9V3zM1 5h2v8H1V5zm6 0h2v8H7V5zm6 0h2v8h-2V5zM2 12h5v2H2v-2zm7 0h5v2H9v-2z" />
);

export const History = createPixelIcon(
  "History",
  <path d="M6 2h5v2H6V2zM4 4h2v2H4V4zm7 0h2v2h-2V4zM2 2h2v4H2V2zm10 4h2v4h-2V6zM8 5h2v4H8V5zm0 3h3v2H8V8zm-4 2h2v2H4v-2zm2 2h5v2H6v-2zm5-2h2v2h-2v-2z" />
);

export const ArrowUpRight = createPixelIcon(
  "ArrowUpRight",
  <path d="M5 3h8v8h-2V6H5V3zm4 4h2v2H9V7zM7 9h2v2H7V9zm-2 2h2v2H5v-2zm-2 2h2v1H3v-1z" />
);

export const ArrowLeft = createPixelIcon(
  "ArrowLeft",
  <path d="M7 2h2v2H7V2zM5 4h2v2H5V4zM3 6h2v2H3V6zM1 7h14v2H1V7zm2 2h2v2H3V9zm2 2h2v2H5v-2zm2 2h2v2H7v-2z" />
);

export const Lock = createPixelIcon(
  "Lock",
  <path d="M5 2h6v2H5V2zM4 4h2v3H4V4zm6 0h2v3h-2V4zM2 7h12v7H2V7zm5 2v3h2V9H7z" />
);

export const X = createPixelIcon(
  "X",
  <path d="M2 2h2v2H2V2zm10 0h2v2h-2V2zM4 4h2v2H4V4zm6 0h2v2h-2V4zM6 6h4v4H6V6zM4 10h2v2H4v-2zm6 0h2v2h-2v-2zM2 12h2v2H2v-2zm10 0h2v2h-2v-2z" />
);

export const Check = createPixelIcon(
  "Check",
  <path d="M12 3h2v2h-2V3zm-2 2h2v2h-2V5zM8 7h2v2H8V7zM6 9h2v2H6V9zM2 8h2v2H2V8zm2 2h2v2H4v-2zm2 1h2v2H6v-2z" />
);

export const ShieldCheck = createPixelIcon(
  "ShieldCheck",
  <path d="M3 2h10v2H3V2zM2 4h2v5H2V4zm10 0h2v5h-2V4zM3 9h2v2H3V9zm8 0h2v2h-2V9zm-6 2h2v2H5v-2zm4 0h2v2H9v-2zm-2 2h2v2H7v-2zm3-7h2v2h-2V6zM8 8h2v2H8V8zM6 7h2v2H6V7z" />
);

export const User = createPixelIcon(
  "User",
  <path d="M6 2h4v2H6V2zM5 4h6v3H5V4zm1 3h4v1H6V7zm-3 3h10v2H3v-2zm-1 2h12v2H2v-2z" />
);

export const Users = createPixelIcon(
  "Users",
  <path d="M3 3h4v3H3V3zm6 0h4v3H9V3zM2 8h6v2H2V8zm-1 2h8v3H1v-3zm8-2h5v2H9V8zm1 2h5v3h-5v-3z" />
);

export const UserPlus = createPixelIcon(
  "UserPlus",
  <path d="M4 2h4v4H4V2zm-2 6h8v2H2V8zm-1 2h10v3H1v-3zm11-4h2v5h-2V6zm-1 1h4v2h-4V7z" />
);

export const UserMinus = createPixelIcon(
  "UserMinus",
  <path d="M4 2h4v4H4V2zm-2 6h8v2H2V8zm-1 2h10v3H1v-3zm10-3h4v2h-4V7z" />
);

export const UserX = createPixelIcon(
  "UserX",
  <path d="M4 2h4v4H4V2zm-2 6h8v2H2V8zm-1 2h10v3H1v-3zm10-4h2v2h-2V6zm3 0h2v2h-2V6zm-1 2h2v2h-2V8zm-2 2h2v2h-2v-2zm3 0h2v2h-2v-2z" />
);

export const Sun = createPixelIcon(
  "Sun",
  <path d="M7 1h2v2H7V1zm0 12h2v2H7v-2zM1 7h2v2H1V7zm12 0h2v2h-2V7zM3 3h2v2H3V3zm8 0h2v2h-2V3zM3 11h2v2H3v-2zm8 0h2v2h-2v-2zM5 5h6v6H5V5z" />
);

export const Moon = createPixelIcon(
  "Moon",
  <path d="M7 2h4v2H7V2zM5 4h4v2H5V4zM4 6h3v4H4V6zm1 4h4v2H5v-2zm2 2h5v2H7v-2zm5-2h2v2h-2v-2z" />
);

export const LogOut = createPixelIcon(
  "LogOut",
  <path d="M2 2h6v2H4v8h4v2H2V2zm8 3h2v2h-2V5zm2 2h2v2h-2V7zM6 7h7v2H6V7zm4 2h2v2h-2V9z" />
);

export const Share2 = createPixelIcon(
  "Share2",
  <path d="M10 2h4v4h-4V2zM2 6h4v4H2V6zm8 4h4v4h-4v-4zM6 6h2v2H6V6zm2-2h2v2H8V4zM6 8h2v2H6V8zm2 2h2v2H8v-2z" />
);

export const Copy = createPixelIcon(
  "Copy",
  <path d="M5 2h8v8h-2V4H5V2zM3 5h7v9H3V5zm2 2v5h3V7H5z" />
);

export const Send = createPixelIcon(
  "Send",
  <path d="M2 2h3v2H2V2zm3 2h5v2H5V4zm5 2h4v3h-4V6zM5 8h5v2H5V8zm-3 2h3v2H2v-2zm0-4h4v2H2V6z" />
);

export const Ban = createPixelIcon(
  "Ban",
  <path d="M5 2h6v2H5V2zM3 4h2v2H3V4zm8 0h2v2h-2V4zM2 6h2v4H2V6zm10 0h2v4h-2V6zM3 10h2v2H3v-2zm8 0h2v2h-2v-2zm-6 2h6v2H5v-2zM4 5h2v2H4V5zm2 2h2v2H6V7zm2 2h2v2H8V9zm2 2h2v2h-2v-2z" />
);

export const ShieldOff = createPixelIcon(
  "ShieldOff",
  <path d="M3 2h10v2H3V2zM2 4h2v5H2V4zm10 0h2v5h-2V4zM3 9h2v2H3V9zm8 0h2v2h-2V9zm-4 3h2v3H7v-3zM2 2h2v2H2V2zm2 2h2v2H4V4zm2 2h2v2H6V6zm2 2h2v2H8V8zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2z" />
);

export const Award = createPixelIcon(
  "Award",
  <path d="M5 2h6v2H5V2zM4 4h8v4H4V4zm1 4h6v2H5V8zm0 2h2v4H5v-4zm4 0h2v4H9v-4z" />
);

export const ChevronUp = createPixelIcon(
  "ChevronUp",
  <path d="M7 4h2v2H7V4zM5 6h2v2H5V6zm4 0h2v2H9V6zM3 8h2v2H3V8zm8 0h2v2h-2V8z" />
);

export const ChevronDown = createPixelIcon(
  "ChevronDown",
  <path d="M3 5h2v2H3V5zm8 0h2v2h-2V5zM5 7h2v2H5V7zm4 0h2v2H9V7zM7 9h2v2H7V9z" />
);

export const ThumbsUp = createPixelIcon(
  "ThumbsUp",
  <path d="M7 2h2v3H7V2zM6 5h7v2H6V5zm0 2h8v5H6V7zM2 7h3v7H2V7zm4 5h6v2H6v-2z" />
);

export const Reply = createPixelIcon(
  "Reply",
  <path d="M5 3h2v2H5V3zM3 5h2v2H3V5zM1 7h2v2H1V7zm2 2h2v2H3V9zm2 2h2v2H5v-2zM3 7h9v2H3V7zm7 2h3v4h-3V9z" />
);

export const Pencil = createPixelIcon(
  "Pencil",
  <path d="M11 2h3v3h-3V2zM9 4h2v2H9V4zM7 6h2v2H7V6zM5 8h2v2H5V8zM3 10h2v2H3v-2zm-1 2h2v2H2v-2z" />
);

export const Trash2 = createPixelIcon(
  "Trash2",
  <path d="M5 2h6v2H5V2zM2 4h12v2H2V4zm1 2h2v8H3V6zm8 0h2v8h-2V6zM6 7h1v5H6V7zm3 0h1v5H9V7zm-4 6h6v1H5v-1z" />
);

export const ImagePlus = createPixelIcon(
  "ImagePlus",
  <path d="M2 3h7v2H4v7h7V8h2v6H2V3zm3 3h2v2H5V6zm1 4h2v2H6v-2zm2-1h2v3H8V9zm3-6h2v4h-2V3zm-1 1h4v2h-4V4z" />
);

export const Eye = createPixelIcon(
  "Eye",
  <path d="M5 4h6v2H5V4zM3 6h2v2H3V6zm8 0h2v2h-2V6zM1 7h2v2H1V7zm12 0h2v2h-2V7zM6 6h4v4H6V6zM3 9h2v2H3V9zm8 0h2v2h-2V9zm-6 2h6v1H5v-1z" />
);

export const FileCheck2 = createPixelIcon(
  "FileCheck2",
  <path d="M3 2h7v2H5v9h6v-2h2v4H3V2zm6 2h3v2H9V4zm2 4h2v2h-2V8zm-2 2h2v2H9v-2zm-2 1h2v2H7v-2z" />
);

export const FileWarning = createPixelIcon(
  "FileWarning",
  <path d="M3 2h7v2H5v9h8v2H3V2zm6 2h3v2H9V4zm3 2h2v8h-2V6zM7 6h2v4H7V6zm0 5h2v1H7v-1z" />
);

export const MessageCircle = createPixelIcon(
  "MessageCircle",
  <path d="M5 2h6v2H5V2zM3 4h2v2H3V4zm8 0h2v2h-2V4zM2 6h2v4H2V6zm10 0h2v4h-2V6zM3 10h2v2H3v-2zm8 0h2v2h-2v-2zm-6 2h6v2H5v-2zM2 12h3v2H2v-2z" />
);

export const MessageCircleWarning = createPixelIcon(
  "MessageCircleWarning",
  <path d="M5 2h6v2H5V2zM3 4h2v2H3V4zm8 0h2v2h-2V4zM2 6h2v4H2V6zm10 0h2v4h-2V6zM3 10h2v2H3v-2zm8 0h2v2h-2v-2zm-6 2h6v2H5v-2zM2 12h3v2H2v-2zM7 5h2v4H7V5zm0 5h2v1H7v-1z" />
);

export const Plus = createPixelIcon(
  "Plus",
  <path d="M7 3h2v10H7V3zM3 7h10v2H3V7z" />
);

export const Loader2 = createPixelIcon(
  "Loader2",
  <path d="M7 2h2v3H7V2zm4 2h2v2h-2V4zm1 3h3v2h-3V7zm-1 4h2v2h-2v-2zm-4 1h2v3H7v-3zm-4-1h2v2H3v-2zM2 7h3v2H2V7zm1-3h2v2H3V4z" />
);
