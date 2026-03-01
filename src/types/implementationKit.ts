// Tech stack option types
export type FrontendFramework = 'react' | 'nextjs' | 'vue';
export type BackendPlatform = 'supabase' | 'firebase' | 'nodejs';
export type AICodingTool = 'cursor' | 'lovable' | 'claude' | 'copilot';
export type DeploymentPlatform = 'vercel' | 'netlify' | 'railway';

export interface TechStack {
  frontend: FrontendFramework;
  backend: BackendPlatform;
  aiTool: AICodingTool;
  deployment: DeploymentPlatform;
}

// Implementation Kit types
export type KitStatus = 'pending' | 'generating' | 'complete' | 'error';

export interface ImplementationKit {
  id: string;
  user_id: string;
  venture_id: string;
  blueprint_id: string | null;
  frontend_framework: FrontendFramework;
  backend_platform: BackendPlatform;
  ai_coding_tool: AICodingTool;
  deployment_platform: DeploymentPlatform;
  status: KitStatus;
  error_message: string | null;
  north_star_spec_id: string | null;
  architecture_contract_id: string | null;
  vertical_slice_plan_id: string | null;
  launch_playbook_id: string | null;
  implementation_folder_id: string | null;
  created_at: string;
  updated_at: string;
  spec_validation: SpecValidationResult | null;
}

export interface SpecValidationFlag {
  document: string;
  severity: 'blocking' | 'warning' | 'suggestion';
  ambiguousText: string;
  issue: string;
  resolutionQuestion: string;
}

export interface SpecValidationResult {
  overallQuality: 'high' | 'medium' | 'low';
  flags: SpecValidationFlag[];
  approvedForExecution: boolean;
}

// Feature PRD types
export type FeaturePriority = 1 | 2 | 3 | 4;
export type FeatureStatus = 'planned' | 'in_progress' | 'complete' | 'blocked';

export interface FeaturePRD {
  id: string;
  user_id: string;
  implementation_kit_id: string;
  workspace_document_id: string | null;
  feature_name: string;
  priority: FeaturePriority;
  status: FeatureStatus;
  user_story: Record<string, unknown> | null;
  acceptance_criteria: Record<string, unknown> | null;
  ui_states: Record<string, unknown> | null;
  data_changes: Record<string, unknown> | null;
  api_endpoints: Record<string, unknown> | null;
  analytics_events: Record<string, unknown> | null;
  estimated_days: number | null;
  actual_days: number | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

// API request/response types
export interface CreateKitRequest {
  blueprintId: string;
  ventureId: string;
  techStack: TechStack;
}

export interface CreateKitResponse {
  kit: ImplementationKit;
  folderId: string;
}

export interface CreateFeaturePRDRequest {
  implementationKitId: string;
  featureName: string;
  priority: FeaturePriority;
  description: string;
}

export interface CreateFeaturePRDResponse {
  prd: FeaturePRD;
  documentId: string;
}

// Tech stack display metadata
export const TECH_STACK_OPTIONS = {
  frontend: [
    { value: 'react' as const, label: 'React', description: 'Popular UI library' },
    { value: 'nextjs' as const, label: 'Next.js', description: 'Full-stack React framework' },
    { value: 'vue' as const, label: 'Vue', description: 'Progressive framework' },
  ],
  backend: [
    { value: 'supabase' as const, label: 'Supabase', description: 'Postgres + Auth + Realtime' },
    { value: 'firebase' as const, label: 'Firebase', description: 'Google cloud platform' },
    { value: 'nodejs' as const, label: 'Node.js', description: 'Custom Express/Fastify' },
  ],
  aiTool: [
    { value: 'cursor' as const, label: 'Cursor', description: 'AI-first code editor' },
    { value: 'lovable' as const, label: 'Lovable', description: 'AI app builder' },
    { value: 'claude' as const, label: 'Claude', description: 'Anthropic AI assistant' },
    { value: 'copilot' as const, label: 'GitHub Copilot', description: 'AI pair programmer' },
  ],
  deployment: [
    { value: 'vercel' as const, label: 'Vercel', description: 'Frontend cloud' },
    { value: 'netlify' as const, label: 'Netlify', description: 'Web platform' },
    { value: 'railway' as const, label: 'Railway', description: 'Full-stack cloud' },
  ],
} as const;
