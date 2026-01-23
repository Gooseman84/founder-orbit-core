-- ============================================
-- Phase 1: SaaS Vibe Coding Kit Schema
-- ============================================

-- 1. Create implementation_kits table
CREATE TABLE public.implementation_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venture_id uuid NOT NULL,
  blueprint_id uuid,
  
  -- Tech stack selections
  frontend_framework text NOT NULL CHECK (frontend_framework IN ('react', 'nextjs', 'vue')),
  backend_platform text NOT NULL CHECK (backend_platform IN ('supabase', 'firebase', 'nodejs')),
  ai_coding_tool text NOT NULL CHECK (ai_coding_tool IN ('cursor', 'lovable', 'claude', 'copilot')),
  deployment_platform text NOT NULL CHECK (deployment_platform IN ('vercel', 'netlify', 'railway')),
  
  -- Generation status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'complete', 'error')),
  error_message text,
  
  -- References to generated documents
  north_star_spec_id uuid,
  architecture_contract_id uuid,
  vertical_slice_plan_id uuid,
  implementation_folder_id uuid,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_implementation_kits_user_id ON public.implementation_kits(user_id);
CREATE INDEX idx_implementation_kits_venture_id ON public.implementation_kits(venture_id);
CREATE INDEX idx_implementation_kits_blueprint_id ON public.implementation_kits(blueprint_id);

-- Enable RLS
ALTER TABLE public.implementation_kits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for implementation_kits
CREATE POLICY "Users can view their own implementation kits"
  ON public.implementation_kits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own implementation kits"
  ON public.implementation_kits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own implementation kits"
  ON public.implementation_kits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own implementation kits"
  ON public.implementation_kits FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Create feature_prds table
CREATE TABLE public.feature_prds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  implementation_kit_id uuid NOT NULL REFERENCES public.implementation_kits(id) ON DELETE CASCADE,
  workspace_document_id uuid REFERENCES public.workspace_documents(id) ON DELETE CASCADE,
  
  -- Feature metadata
  feature_name text NOT NULL,
  priority integer NOT NULL CHECK (priority BETWEEN 1 AND 4),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'complete', 'blocked')),
  
  -- PRD sections (stored as JSON for flexibility)
  user_story jsonb,
  acceptance_criteria jsonb,
  ui_states jsonb,
  data_changes jsonb,
  api_endpoints jsonb,
  analytics_events jsonb,
  
  -- Tracking
  estimated_days integer,
  actual_days integer,
  blocked_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for feature_prds
CREATE INDEX idx_feature_prds_user_id ON public.feature_prds(user_id);
CREATE INDEX idx_feature_prds_kit_id ON public.feature_prds(implementation_kit_id);
CREATE INDEX idx_feature_prds_priority ON public.feature_prds(priority);
CREATE INDEX idx_feature_prds_status ON public.feature_prds(status);

-- Enable RLS
ALTER TABLE public.feature_prds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_prds
CREATE POLICY "Users can view their own feature PRDs"
  ON public.feature_prds FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own feature PRDs"
  ON public.feature_prds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feature PRDs"
  ON public.feature_prds FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feature PRDs"
  ON public.feature_prds FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Add updated_at triggers (function already exists)
CREATE TRIGGER update_implementation_kits_updated_at
  BEFORE UPDATE ON public.implementation_kits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_prds_updated_at
  BEFORE UPDATE ON public.feature_prds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();