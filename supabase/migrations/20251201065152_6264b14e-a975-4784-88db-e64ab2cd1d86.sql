-- Ensure status column exists and has NOT NULL constraint
-- First update any NULL values to 'draft'
UPDATE public.workspace_documents SET status = 'draft' WHERE status IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE public.workspace_documents ALTER COLUMN status SET NOT NULL;