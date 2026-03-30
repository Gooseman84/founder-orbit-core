DROP POLICY IF EXISTS "Service role can insert patterns" ON founder_patterns;

CREATE POLICY "Service role can insert patterns"
  ON founder_patterns
  FOR INSERT
  TO service_role
  WITH CHECK (true);