-- Recreate pg_net extension in extensions schema to satisfy linter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    DROP EXTENSION pg_net;
  END IF;
END $$;

-- Create in extensions schema (preferred over public)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;