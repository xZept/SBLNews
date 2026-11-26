-- 0005_seed_guidelines.sql
-- Seed initial 3 core hubs (Hypertrophy, Maximal Strength, Recovery & Nutrition)
-- and 6 indexed training variables for the Living Evidence Matrix (/guidelines).

INSERT INTO public.guidelines (
  slug,
  hub,
  variable_name,
  display_order,
  evidence_grade,
  consensus_summary,
  practical_prescription,
  anchor_study_ids,
  changelog
)
VALUES
  (
    'weekly-volume',
    'Hypertrophy',
    'Weekly Volume',
    1,
    'A',
    'A clear dose-response relationship exists between weekly fractional set volume and muscle hypertrophy up to moderate-to-high volumes, provided sets are taken close to muscular failure. Beyond ~20 hard sets per muscle group per week, marginal gains diminish and recovery demands rise sharply.',
    '10-20 hard sets / muscle / week',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from meta-analytic dose-response literature.", "study_id": null}]'::jsonb
  ),
  (
    'rir-failure',
    'Hypertrophy',
    'RIR / Failure',
    2,
    'A',
    'Hypertrophy is maximized when working sets terminate within 0-3 repetitions in reserve (RIR). Training to absolute concentric failure every set is unnecessary for most compound movements and increases neuromuscular fatigue, whereas stopping >4 RIR reduces stimulus.',
    '1-3 RIR on compounds; 0-1 RIR on isolations',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from proximity-to-failure meta-analyses.", "study_id": null}]'::jsonb
  ),
  (
    'lengthened-partials',
    'Hypertrophy',
    'Lengthened Partials',
    3,
    'B',
    'Training muscles at long muscle lengths—either via full range of motion emphasizing the stretched position or lengthened partial repetitions—consistently matches or exceeds standard full-ROM hypertrophy in several limb musculature trials.',
    'Prioritize loaded stretch; add lengthened partials on isolations',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from long-length resistance training trials.", "study_id": null}]'::jsonb
  ),
  (
    'frequency',
    'Maximal Strength',
    'Frequency',
    4,
    'A',
    'When weekly volume is equated, training frequency has a modest direct effect on hypertrophy, while higher frequencies (2-4x/week per lift) facilitate higher-quality technical practice and heavier average bar speeds for maximal strength.',
    '2-4 sessions / muscle or lift / week',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from volume-equated frequency meta-analyses.", "study_id": null}]'::jsonb
  ),
  (
    'rest-intervals',
    'Maximal Strength',
    'Rest Intervals',
    5,
    'B',
    'Longer inter-set rest intervals (>=2-3 minutes) preserve total repetition volume and mechanical tension across multi-joint compound sets compared with <=60-second rests, supporting superior maximal strength and equal or greater hypertrophy.',
    '2-3+ min for compounds; 60-90s for isolations',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from inter-set rest interval controlled trials.", "study_id": null}]'::jsonb
  ),
  (
    'protein-intake',
    'Recovery & Nutrition',
    'Protein Intake',
    6,
    'A',
    'Daily total protein intake is the primary nutritional driver of resistance-training-induced lean mass and recovery. Benefits plateau near ~1.6 g/kg/day for most lifters, with intakes up to 2.2 g/kg/day offering a practical buffer during energy restriction.',
    '1.6-2.2 g / kg bodyweight / day',
    '{}',
    '[{"updated_at": "2026-11-26T00:00:00Z", "summary": "Initial MVP consensus baseline seeded from protein supplementation meta-analyses.", "study_id": null}]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
