export interface AiSearchTierConfig {
  tier1Groq: {
    apiKey: string | null;
    model: string;
    timeoutMs: number;
  };
  tier2OpenRouter: {
    apiKey: string | null;
    model: string;
    altModel: string;
    timeoutMs: number;
  };
  tier3Gemini: {
    apiKey: string | null;
    model: string;
    timeoutMs: number;
  };
}

export interface AiSearchConfig {
  dailyQuotaLimit: number;
  cacheTtlDays: 7 | 30;
  tiers: AiSearchTierConfig;
}

const DEFAULT_DAILY_QUOTA_LIMIT = 10;
const MIN_DAILY_QUOTA_LIMIT = 1;
const MAX_DAILY_QUOTA_LIMIT = 100;

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";
const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const DEFAULT_OPENROUTER_ALT_MODEL =
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

const DEFAULT_TIER1_TIMEOUT_MS = 6000;
const DEFAULT_TIER2_TIMEOUT_MS = 7000;
const DEFAULT_TIER3_TIMEOUT_MS = 8000;

function parseBoundedInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseCacheTtlDays(raw: string | undefined): 7 | 30 {
  if (!raw) return 7;
  const parsed = Number.parseInt(raw.trim(), 10);
  return parsed === 30 ? 30 : 7;
}

function readOptionalEnv(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Returns runtime configuration for `/api/ai-search` quota, TTL cache, and
 * 3-tier inference failover (`Groq` -> `OpenRouter :free` -> `Gemini Free Tier`).
 */
export function getAiSearchConfig(): AiSearchConfig {
  return {
    dailyQuotaLimit: parseBoundedInt(
      process.env.AI_DAILY_QUOTA_LIMIT,
      DEFAULT_DAILY_QUOTA_LIMIT,
      MIN_DAILY_QUOTA_LIMIT,
      MAX_DAILY_QUOTA_LIMIT
    ),
    cacheTtlDays: parseCacheTtlDays(process.env.AI_CACHE_TTL_DAYS),
    tiers: {
      tier1Groq: {
        apiKey: readOptionalEnv(process.env.GROQ_API_KEY),
        model: readOptionalEnv(process.env.AI_TIER1_GROQ_MODEL) ?? DEFAULT_GROQ_MODEL,
        timeoutMs: parseBoundedInt(
          process.env.AI_TIER1_TIMEOUT_MS,
          DEFAULT_TIER1_TIMEOUT_MS,
          1000,
          30000
        ),
      },
      tier2OpenRouter: {
        apiKey: readOptionalEnv(process.env.OPENROUTER_API_KEY),
        model:
          readOptionalEnv(process.env.AI_TIER2_OPENROUTER_MODEL) ??
          DEFAULT_OPENROUTER_MODEL,
        altModel:
          readOptionalEnv(process.env.AI_TIER2_OPENROUTER_ALT_MODEL) ??
          DEFAULT_OPENROUTER_ALT_MODEL,
        timeoutMs: parseBoundedInt(
          process.env.AI_TIER2_TIMEOUT_MS,
          DEFAULT_TIER2_TIMEOUT_MS,
          1000,
          30000
        ),
      },
      tier3Gemini: {
        apiKey: readOptionalEnv(process.env.GEMINI_API_KEY),
        model:
          readOptionalEnv(process.env.AI_TIER3_GEMINI_MODEL) ??
          DEFAULT_GEMINI_MODEL,
        timeoutMs: parseBoundedInt(
          process.env.AI_TIER3_TIMEOUT_MS,
          DEFAULT_TIER3_TIMEOUT_MS,
          1000,
          30000
        ),
      },
    },
  };
}
