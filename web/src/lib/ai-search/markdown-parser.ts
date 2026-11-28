export type InlineLeafSpan =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "citation";
      rawToken: string;
      labels: string[];
    };

export type InlineSpan =
  | InlineLeafSpan
  | {
      type: "strong";
      children: InlineLeafSpan[];
    };

export type SynthesisBlock =
  | {
      type: "paragraph";
      spans: InlineSpan[];
    }
  | {
      type: "unordered-list";
      items: InlineSpan[][];
    }
  | {
      type: "ordered-list";
      items: InlineSpan[][];
    };

export interface SynthesisSection {
  /**
   * Normalized section title (e.g., "Consensus & Bottom Line",
   * "Evidence Breakdown", "Limitations & Gaps"), or null for legacy
   * unsectioned prose / introductory paragraphs.
   */
  title: string | null;
  blocks: SynthesisBlock[];
}

export interface StructuredAiSynthesis {
  sections: SynthesisSection[];
}

const HEADING_REGEX = /^\s*#{1,4}\s+(.+?)\s*$/;
const STANDALONE_BOLD_HEADING_REGEX =
  /^\s*\*\*(Consensus & Bottom Line|Evidence Breakdown|Limitations & Gaps|Bottom Line|Key Findings|Limitations)[:\s]*\*\*\s*$/i;
const UNORDERED_LIST_REGEX = /^\s*[-*•]\s+(.+)$/;
const ORDERED_LIST_REGEX = /^\s*\d+[.)]\s+(.+)$/;
const STRONG_PAIR_REGEX = /\*\*(?!\s)([^*]+?)(?<!\s)\*\*/g;
const CITATION_GROUP_REGEX = /(\[(?:S[1-5])(?:\s*,\s*S[1-5])*\])/g;
const STRAY_ASTERISKS_REGEX = /\*{2,}/g;

function stripStrayAsterisks(text: string): string {
  return text.replace(STRAY_ASTERISKS_REGEX, "");
}

function normalizeHeadingTitle(rawTitle: string): string {
  return stripStrayAsterisks(rawTitle)
    .replace(/^#+\s*/, "")
    .replace(/[:\s]+$/, "")
    .trim();
}

function tokenizeLeafSpans(text: string): InlineLeafSpan[] {
  const cleaned = stripStrayAsterisks(text);
  if (!cleaned) {
    return [];
  }

  const spans: InlineLeafSpan[] = [];
  let lastIndex = 0;
  CITATION_GROUP_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CITATION_GROUP_REGEX.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      spans.push({
        type: "text",
        value: cleaned.slice(lastIndex, match.index),
      });
    }

    const rawToken = match[1];
    const labels = rawToken
      .slice(1, -1)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    spans.push({
      type: "citation",
      rawToken,
      labels,
    });

    lastIndex = match.index + rawToken.length;
  }

  if (lastIndex < cleaned.length) {
    spans.push({
      type: "text",
      value: cleaned.slice(lastIndex),
    });
  }

  return spans;
}

function tokenizeInlineSpans(text: string): InlineSpan[] {
  if (!text) {
    return [];
  }

  const spans: InlineSpan[] = [];
  let lastIndex = 0;
  STRONG_PAIR_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = STRONG_PAIR_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      spans.push(...tokenizeLeafSpans(text.slice(lastIndex, match.index)));
    }

    const innerContent = match[1];
    if (innerContent.trim().length > 0) {
      const children = tokenizeLeafSpans(innerContent);
      if (children.length > 0) {
        spans.push({
          type: "strong",
          children,
        });
      }
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    spans.push(...tokenizeLeafSpans(text.slice(lastIndex)));
  }

  return spans;
}

/**
 * Deterministically parses streamed or cached AI synthesis Markdown into
 * structured sections, semantic list/paragraph blocks, and inline spans
 * while stripping 100% of unmatched, trailing, or stray `**` delimiters.
 */
export function parseStructuredAiSynthesis(
  markdown: string
): StructuredAiSynthesis {
  if (!markdown || !markdown.trim()) {
    return { sections: [] };
  }

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const sections: SynthesisSection[] = [];
  let currentSection: SynthesisSection = { title: null, blocks: [] };

  let paragraphLines: string[] = [];
  let listType: "unordered-list" | "ordered-list" | null = null;
  let listItems: InlineSpan[][] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const joined = paragraphLines.join(" ").trim();
    paragraphLines = [];
    if (!joined) return;
    const spans = tokenizeInlineSpans(joined);
    if (spans.length > 0) {
      currentSection.blocks.push({ type: "paragraph", spans });
    }
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    currentSection.blocks.push({
      type: listType,
      items: listItems,
    });
    listType = null;
    listItems = [];
  };

  const pushCurrentSection = () => {
    flushParagraph();
    flushList();
    if (currentSection.title !== null || currentSection.blocks.length > 0) {
      sections.push(currentSection);
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch =
      HEADING_REGEX.exec(line) ?? STANDALONE_BOLD_HEADING_REGEX.exec(line);
    if (headingMatch) {
      const normalizedTitle = normalizeHeadingTitle(headingMatch[1]);
      if (normalizedTitle.length > 0) {
        pushCurrentSection();
        currentSection = { title: normalizedTitle, blocks: [] };
      }
      continue;
    }

    const unorderedMatch = UNORDERED_LIST_REGEX.exec(line);
    if (unorderedMatch) {
      flushParagraph();
      if (listType === "ordered-list") {
        flushList();
      }
      listType = "unordered-list";
      const itemSpans = tokenizeInlineSpans(unorderedMatch[1].trim());
      if (itemSpans.length > 0) {
        listItems.push(itemSpans);
      }
      continue;
    }

    const orderedMatch = ORDERED_LIST_REGEX.exec(line);
    if (orderedMatch) {
      flushParagraph();
      if (listType === "unordered-list") {
        flushList();
      }
      listType = "ordered-list";
      const itemSpans = tokenizeInlineSpans(orderedMatch[1].trim());
      if (itemSpans.length > 0) {
        listItems.push(itemSpans);
      }
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  pushCurrentSection();

  return { sections };
}
