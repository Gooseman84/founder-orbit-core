-- Create venture_state enum
CREATE TYPE venture_state AS ENUM ('inactive', 'committed', 'executing', 'reviewed', 'killed');

-- Add new columns to ventures table
ALTER TABLE public.ventures 
  ADD COLUMN venture_state venture_state NOT NULL DEFAULT 'inactive',
  ADD COLUMN commitment_window_days integer CHECK (commitment_window_days IN (14, 30, 90)),
  ADD COLUMN commitment_start_at timestamp with time zone,
  ADD COLUMN commitment_end_at timestamp with time zone,
  ADD COLUMN success_metric text;

-- Migrate existing status values to venture_state
UPDATE public.ventures 
SET venture_state = CASE 
  WHEN status = 'active' THEN 'inactive'::venture_state
  WHEN status = 'paused' THEN 'inactive'::venture_state
  WHEN status = 'archived' THEN 'killed'::venture_state
  ELSE 'inactive'::venture_state
END;

-- Create function to validate venture state transitions
CREATE OR REPLACE FUNCTION public.validate_venture_state_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If state hasn't changed, allow
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
$$;

-- Create trigger for state validation
CREATE TRIGGER validate_venture_state_transition_trigger
  BEFORE UPDATE ON public.ventures
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_venture_state_transition();

-- Create function to enforce only one active venture per user
CREATE OR REPLACE FUNCTION public.enforce_single_active_venture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check on insert or when transitioning TO an active state
  IF NEW.venture_state IN ('committed', 'executing', 'reviewed') THEN
    IF EXISTS (
      SELECT 1 FROM public.ventures 
      WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND venture_state IN ('committed', 'executing', 'reviewed')
    ) THEN
      RAISE EXCEPTION 'Only one active venture allowed per user. Please complete or kill your current venture first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for single active venture
CREATE TRIGGER enforce_single_active_venture_trigger
  BEFORE INSERT OR UPDATE ON public.ventures
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_venture();