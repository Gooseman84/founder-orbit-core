-- Add platform mode, context hash, and source updated tracking to master_prompts
ALTER TABLE public.master_prompts 
ADD COLUMN IF NOT EXISTS platform_mode TEXT DEFAULT 'strategy',
ADD COLUMN IF NOT EXISTS context_hash TEXT,
ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ;

-- Add index for faster lookups by platform mode
CREATE INDEX IF NOT EXISTS idx_master_prompts_platform_mode ON public.master_prompts(platform_mode);

-- Add comment for documentation
COMMENT ON COLUMN public.master_prompts.platform_mode IS 'strategy | lovable | cursor | v0';
COMMENT ON COLUMN public.master_prompts.context_hash IS 'Hash of input sources for staleness detection';
COMMENT ON COLUMN public.master_prompts.source_updated_at IS 'Latest updated_at from any input source';