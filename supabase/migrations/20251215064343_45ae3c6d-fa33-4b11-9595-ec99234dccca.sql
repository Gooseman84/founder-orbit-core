-- Deduplicate existing rows (keep newest per user/idea/platform)
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, idea_id, platform_mode
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM master_prompts
)
DELETE FROM master_prompts
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Enforce uniqueness per platform mode
ALTER TABLE master_prompts
ADD CONSTRAINT master_prompts_user_idea_mode_unique
UNIQUE (user_id, idea_id, platform_mode);