import type {
  InspectionDepthType,
  StudyDesignType,
} from "@/lib/queries/projections";
import { formatStudyDesign } from "@/lib/queries/study-badges";

export interface ShareableStudy {
  id: string;
  title: string;
  journal: string;
  publication_year: number;
  study_design: StudyDesignType;
  inspection_depth: InspectionDepthType;
  quality_score: number;
  summary_takeaway?: string;
}

/**
 * Resolves the canonical site origin without a trailing slash.
 */
export function resolveSiteOrigin(explicitOrigin?: string): string {
  const candidate =
    explicitOrigin?.trim() ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (candidate) {
    const normalized = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`;
    return normalized.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

/**
 * Builds the canonical `/study/[id]` URL for a study.
 */
export function buildCanonicalStudyUrl(
  studyId: string,
  origin?: string
): string {
  return `${resolveSiteOrigin(origin)}/study/${studyId}`;
}

/**
 * Formats a concise, SBL News-attributed citation + canonical URL for clipboard copy.
 */
export function formatStudyCitation(
  study: ShareableStudy,
  origin?: string
): string {
  const canonicalUrl = buildCanonicalStudyUrl(study.id, origin);
  const designLabel = formatStudyDesign(study.study_design);
  return `"${study.title}" (${study.journal}, ${study.publication_year}) — Evidence breakdown [${designLabel} • ${study.inspection_depth}] via SBL News: ${canonicalUrl}`;
}

/**
 * Formats a Discord-ready Markdown share snippet attributing SBL News.
 */
export function formatDiscordShareMarkdown(
  study: ShareableStudy,
  origin?: string
): string {
  const canonicalUrl = buildCanonicalStudyUrl(study.id, origin);
  const designLabel = formatStudyDesign(study.study_design);
  return [
    `**${study.title}** (${study.journal}, ${study.publication_year})`,
    `[${designLabel} • ${study.inspection_depth} • Score ${study.quality_score}/100] via SBL News`,
    canonicalUrl,
  ].join("\n");
}

/**
 * Builds external share URLs for X / Twitter, Reddit, and WhatsApp.
 */
export function buildExternalShareUrls(
  study: ShareableStudy,
  origin?: string
): {
  canonicalUrl: string;
  xUrl: string;
  redditUrl: string;
  whatsappUrl: string;
} {
  const canonicalUrl = buildCanonicalStudyUrl(study.id, origin);
  const designLabel = formatStudyDesign(study.study_design);

  const xText = `"${study.title}" (${study.journal}, ${study.publication_year}) [${designLabel} • ${study.inspection_depth}] via SBL News`;
  const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(canonicalUrl)}`;

  const redditTitle = `${study.title} (${study.journal}, ${study.publication_year}) [${designLabel}] — SBL News`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(canonicalUrl)}&title=${encodeURIComponent(redditTitle)}`;

  const whatsappText = formatStudyCitation(study, origin);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  return {
    canonicalUrl,
    xUrl,
    redditUrl,
    whatsappUrl,
  };
}
