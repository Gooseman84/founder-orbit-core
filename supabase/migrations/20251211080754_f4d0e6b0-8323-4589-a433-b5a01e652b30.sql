-- Add fusion_metadata JSONB column to ideas table for tracking lineage
ALTER TABLE public.ideas 
ADD COLUMN IF NOT EXISTS fusion_metadata jsonb DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.ideas.fusion_metadata IS 'Stores fusion lineage: source_idea_ids, source_titles, fusion_mode';