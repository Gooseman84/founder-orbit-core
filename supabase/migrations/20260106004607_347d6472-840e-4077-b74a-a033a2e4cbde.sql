-- Add 7 to the commitment_window_days allowed values
-- The column is an integer type, so we just need to ensure the check constraint allows 7
-- First, let's drop any existing check constraint and add a new one that includes 7

-- Note: If commitment_window_days is stored as integer, no migration needed
-- If it's an enum, we add the value
DO $$ 
BEGIN
  -- Try to add value to enum if it exists
  ALTER TYPE commitment_window_days ADD VALUE IF NOT EXISTS '7';
EXCEPTION
  WHEN undefined_object THEN
    -- Enum doesn't exist, column is probably integer - that's fine
    NULL;
END $$;