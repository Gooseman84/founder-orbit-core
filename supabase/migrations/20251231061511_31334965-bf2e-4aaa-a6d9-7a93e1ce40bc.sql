-- Update the state transition validator to allow inactive -> executing directly
-- and remove references to 'committed' as a required intermediate state

CREATE OR REPLACE FUNCTION public.validate_venture_state_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- If state hasn't changed, allow the update immediately (prevents blocking unrelated updates)
  IF OLD.venture_state = NEW.venture_state THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  -- inactive -> executing (direct start)
  -- executing -> reviewed
  -- reviewed -> executing, inactive, killed (continue, pivot, kill)
  -- killed -> (no transitions allowed)

  IF OLD.venture_state = 'killed' THEN
    RAISE EXCEPTION 'Cannot transition from killed state - it is terminal';
  END IF;

  IF OLD.venture_state = 'inactive' AND NEW.venture_state NOT IN ('executing') THEN
    RAISE EXCEPTION 'Invalid transition: inactive can only go to executing';
  END IF;

  IF OLD.venture_state = 'executing' AND NEW.venture_state NOT IN ('reviewed') THEN
    RAISE EXCEPTION 'Invalid transition: executing can only go to reviewed';
  END IF;

  IF OLD.venture_state = 'reviewed' AND NEW.venture_state NOT IN ('executing', 'inactive', 'killed') THEN
    RAISE EXCEPTION 'Invalid transition: reviewed can only go to executing, inactive, or killed';
  END IF;

  -- Validate that executing state has all commitment fields
  IF NEW.venture_state = 'executing' THEN
    IF NEW.commitment_window_days IS NULL THEN
      RAISE EXCEPTION 'commitment_window_days is required for executing state';
    END IF;
    IF NEW.commitment_start_at IS NULL THEN
      RAISE EXCEPTION 'commitment_start_at is required for executing state';
    END IF;
    IF NEW.commitment_end_at IS NULL THEN
      RAISE EXCEPTION 'commitment_end_at is required for executing state';
    END IF;
    IF NEW.success_metric IS NULL OR NEW.success_metric = '' THEN
      RAISE EXCEPTION 'success_metric is required for executing state';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$