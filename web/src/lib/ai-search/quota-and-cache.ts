import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiCitationStudy,
  AiQuotaStatus,
  AiTierName,
} from "@/lib/queries/projections";

interface QuotaRpcRow {
  allowed: boolean;
  is_admin: boolean;
  daily_limit: number;
  used_today: number;
  remaining_today: number;
  resets_at_utc: string;
}

interface CacheRpcRow {
  cache_key: string;
  normalized_query: string;
  filter_signature: string;
  answer_markdown: string;
  citations: AiCitationStudy[];
  tier_used: AiTierName;
  created_at: string;
  expires_at: string;
}

export interface CachedAiSynthesis {
  cacheKey: string;
  normalizedQuery: string;
  filterSignature: string;
  answerMarkdown: string;
  citations: AiCitationStudy[];
  tierUsed: AiTierName;
  createdAt: string;
  expiresAt: string;
}

function mapQuotaRow(row: QuotaRpcRow): AiQuotaStatus {
  return {
    allowed: Boolean(row.allowed),
    isAdmin: Boolean(row.is_admin),
    dailyLimit: Number(row.daily_limit),
    usedToday: Number(row.used_today),
    remainingToday: Number(row.remaining_today),
    resetsAtUtc: String(row.resets_at_utc),
  };
}

function extractFirstRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) {
    return (data[0] as T | undefined) ?? null;
  }
  if (data && typeof data === "object") {
    return data as T;
  }
  return null;
}

export async function getMyAiQuotaStatus(
  supabase: SupabaseClient,
  dailyLimit: number
): Promise<AiQuotaStatus> {
  const { data, error } = await supabase.rpc("get_my_ai_quota_status", {
    p_daily_limit: dailyLimit,
  });

  if (error) {
    throw new Error(`get_my_ai_quota_status failed: ${error.message}`);
  }

  const row = extractFirstRow<QuotaRpcRow>(data);
  if (!row) {
    throw new Error("get_my_ai_quota_status returned no rows");
  }

  return mapQuotaRow(row);
}

export async function checkAndIncrementAiQuota(
  supabase: SupabaseClient,
  dailyLimit: number
): Promise<AiQuotaStatus> {
  const { data, error } = await supabase.rpc("check_and_increment_ai_quota", {
    p_daily_limit: dailyLimit,
  });

  if (error) {
    throw new Error(`check_and_increment_ai_quota failed: ${error.message}`);
  }

  const row = extractFirstRow<QuotaRpcRow>(data);
  if (!row) {
    throw new Error("check_and_increment_ai_quota returned no rows");
  }

  return mapQuotaRow(row);
}

export async function refundAiQuota(
  supabase: SupabaseClient,
  dailyLimit: number
): Promise<AiQuotaStatus> {
  const { data, error } = await supabase.rpc("refund_ai_quota", {
    p_daily_limit: dailyLimit,
  });

  if (error) {
    throw new Error(`refund_ai_quota failed: ${error.message}`);
  }

  const row = extractFirstRow<QuotaRpcRow>(data);
  if (!row) {
    throw new Error("refund_ai_quota returned no rows");
  }

  return mapQuotaRow(row);
}

export async function getCachedAiSynthesis(
  supabase: SupabaseClient,
  cacheKey: string
): Promise<CachedAiSynthesis | null> {
  const { data, error } = await supabase.rpc("get_cached_ai_synthesis", {
    p_cache_key: cacheKey,
  });

  if (error) {
    console.error("get_cached_ai_synthesis failed:", error.message);
    return null;
  }

  const row = extractFirstRow<CacheRpcRow>(data);
  if (!row) return null;

  return {
    cacheKey: row.cache_key,
    normalizedQuery: row.normalized_query,
    filterSignature: row.filter_signature,
    answerMarkdown: row.answer_markdown,
    citations: Array.isArray(row.citations) ? row.citations : [],
    tierUsed: row.tier_used,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function putCachedAiSynthesis(
  supabase: SupabaseClient,
  params: {
    cacheKey: string;
    normalizedQuery: string;
    filterSignature: string;
    answerMarkdown: string;
    citations: AiCitationStudy[];
    tierUsed: AiTierName;
    ttlDays: 7 | 30;
  }
): Promise<void> {
  const { error } = await supabase.rpc("put_cached_ai_synthesis", {
    p_cache_key: params.cacheKey,
    p_normalized_query: params.normalizedQuery,
    p_filter_signature: params.filterSignature,
    p_answer_markdown: params.answerMarkdown,
    p_citations: params.citations,
    p_tier_used: params.tierUsed,
    p_ttl_days: params.ttlDays,
  });

  if (error) {
    console.error("put_cached_ai_synthesis failed:", error.message);
  }
}
