-- Fix 1: Update validate_venture_state_transition() to skip when state hasn't changed
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
  -- inactive -> committed
  -- committed -> executing, inactive
  -- executing -> reviewed
  -- reviewed -> committed, inactive, killed
  -- killed -> (no transitions allowed)

  IF OLD.venture_state = 'killed' THEN
    RAISE EXCEPTION 'Cannot transition from killed state - it is terminal';
  END IF;

  IF OLD.venture_state = 'inactive' AND NEW.venture_state NOT IN ('committed') THEN
    RAISE EXCEPTION 'Invalid transition: inactive can only go to committed';
  END IF;

  IF OLD.venture_state = 'committed' AND NEW.venture_state NOT IN ('executing', 'inactive') THEN
    RAISE EXCEPTION 'Invalid transition: committed can only go to executing or inactive';
  END IF;

  IF OLD.venture_state = 'executing' AND NEW.venture_state NOT IN ('reviewed') THEN
    RAISE EXCEPTION 'Invalid transition: executing can only go to reviewed';
  END IF;

  IF OLD.venture_state = 'reviewed' AND NEW.venture_state NOT IN ('committed', 'inactive', 'killed') THEN
    RAISE EXCEPTION 'Invalid transition: reviewed can only go to committed, inactive, or killed';
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
$function$;

-- Fix 2: Temporarily exclude 'reviewed' from active states to prevent deadlock
-- (We'll re-add it once the Review UI is built)
CREATE OR REPLACE FUNCTION public.enforce_single_active_venture()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check on insert or when transitioning TO an active state
  -- TEMPORARY: Only 'committed' and 'executing' count as active (not 'reviewed')
  -- This prevents deadlock since we don't have a Review Decision UI yet
  IF NEW.venture_state IN ('committed', 'executing') THEN
    IF EXISTS (
      SELECT 1 FROM public.ventures 
      WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND venture_state IN ('committed', 'executing')
    ) THEN
      RAISE EXCEPTION 'Only one active venture allowed per user. Please complete or kill your current venture first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;