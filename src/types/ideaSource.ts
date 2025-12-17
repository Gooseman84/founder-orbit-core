// Types for multi-source idea foundation

// Enum for idea source types (matches DB enum)
export type IdeaSourceType = 'generated' | 'market_signal' | 'imported' | 'fused';

// Market signal domain from market_signal_domains table
export interface MarketSignalDomain {
  id: string;
  domain: string;
  priority: 'core' | 'high' | 'medium';
  subreddits: string[];
  is_active: boolean;
  created_at: string;
}

// Market signal run record
export interface MarketSignalRun {
  id: string;
  user_id: string;
  selected_domains: string[];
  selected_subreddits: string[];
  founder_profile_snapshot: Record<string, any> | null;
  created_at: string;
}

// Source metadata for different idea sources
export interface IdeaSourceMeta {
  // For market_signal ideas
  domains?: string[];
  subreddits?: string[];
  signal_run_id?: string;
  reddit_thread_urls?: string[];
  
  // For imported ideas
  import_raw_text?: string;
  import_source?: string; // "manual", "csv", "notion", etc.
  import_timestamp?: string;
  
  // For fused ideas
  fusion_mode?: string;
  fusion_notes?: string;
  blended_modes?: string[];
  
  // Generic metadata
  [key: string]: any;
}

// Extended idea fields for multi-source support
export interface IdeaSourceFields {
  source_type: IdeaSourceType;
  source_meta: IdeaSourceMeta;
  normalized?: Record<string, any> | null;
  parent_idea_ids?: string[] | null;
}

// Helper to create default source fields for AI-generated ideas
export function createGeneratedSourceFields(): IdeaSourceFields {
  return {
    source_type: 'generated',
    source_meta: {},
    normalized: null,
    parent_idea_ids: null,
  };
}

// Helper to create source fields for fused ideas
export function createFusedSourceFields(
  parentIds: string[],
  fusionMode?: string,
  blendedModes?: string[],
  fusionNotes?: string
): IdeaSourceFields {
  return {
    source_type: 'fused',
    source_meta: {
      fusion_mode: fusionMode,
      blended_modes: blendedModes,
      fusion_notes: fusionNotes,
    },
    parent_idea_ids: parentIds,
  };
}

// Helper to create source fields for market signal ideas
export function createMarketSignalSourceFields(
  domains: string[],
  subreddits: string[],
  signalRunId?: string
): IdeaSourceFields {
  return {
    source_type: 'market_signal',
    source_meta: {
      domains,
      subreddits,
      signal_run_id: signalRunId,
    },
  };
}

// Helper to create source fields for imported ideas
export function createImportedSourceFields(
  rawText: string,
  importSource: string = 'manual'
): IdeaSourceFields {
  return {
    source_type: 'imported',
    source_meta: {
      import_raw_text: rawText,
      import_source: importSource,
      import_timestamp: new Date().toISOString(),
    },
  };
}
