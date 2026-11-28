import { z } from "zod";
import {
  SEARCH_QUERY_MAX_LENGTH,
  StudyDesignEnum,
} from "@/lib/validations/search";

export const AI_QUERY_MIN_LENGTH = 3;
export const AI_QUERY_MAX_LENGTH = SEARCH_QUERY_MAX_LENGTH;

export const AiSearchRequestSchema = z.object({
  q: z
    .string()
    .trim()
    .min(
      AI_QUERY_MIN_LENGTH,
      `Question must be at least ${AI_QUERY_MIN_LENGTH} characters.`
    )
    .max(
      AI_QUERY_MAX_LENGTH,
      `Question must be ${AI_QUERY_MAX_LENGTH} characters or fewer.`
    ),
  study_design: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    StudyDesignEnum.optional()
  ),
  min_duration_weeks: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : val),
    z.coerce.number().int().min(0).max(520).optional()
  ),
  trained_only: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      if (val === true || val === "true" || val === "on" || val === "1") return true;
      if (val === false || val === "false" || val === "0") return false;
      return val;
    },
    z.boolean().optional()
  ),
});

export type AiSearchRequestInput = z.infer<typeof AiSearchRequestSchema>;
