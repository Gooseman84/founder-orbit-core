import { SupabaseClient } from '@supabase/supabase-js';

export interface UserContext {
  profile: any | null;
  extendedIntake: any | null;
  chosenIdea: any | null;
  ideaAnalysis: any | null;
  recentDocs: any[];
  recentReflections: any[];
}

/**
 * Builds a comprehensive user context by fetching all relevant data in parallel.
 * This is the single source of truth for user context across all AI edge functions.
 */
export async function buildUserContext(
  userId: string,
  supabase: SupabaseClient
): Promise<UserContext> {
  const [
    profileRes,
    extendedIntakeRes,
    chosenIdeaRes,
    recentDocsRes,
    recentReflectionsRes,
  ] = await Promise.all([
    // 1) Founder profile
    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    // 2) Extended intake / questionnaire (if exists)
    supabase
      .from('user_intake_extended')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    // 3) Chosen idea (current main project) - uses status='chosen'
    supabase
      .from('ideas')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'chosen')
      .maybeSingle(),

    // 4) Recent workspace documents (last 3 by updated_at)
    supabase
      .from('workspace_documents')
      .select('id, title, content, doc_type, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3),

    // 5) Recent reflections (last 7 days)
    supabase
      .from('daily_reflections')
      .select('reflection_date, ai_summary, ai_theme, energy_level, stress_level, mood_tags, what_did, top_priority')
      .eq('user_id', userId)
      .order('reflection_date', { ascending: false })
      .limit(7),
  ]);

  // If we have a chosen idea, also fetch its analysis
  let ideaAnalysis = null;
  if (chosenIdeaRes.data?.id) {
    const { data: analysis } = await supabase
      .from('idea_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('idea_id', chosenIdeaRes.data.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    ideaAnalysis = analysis;
  }

  return {
    profile: profileRes.data ?? null,
    extendedIntake: extendedIntakeRes.data ?? null,
    chosenIdea: chosenIdeaRes.data ?? null,
    ideaAnalysis,
    recentDocs: recentDocsRes.data ?? [],
    recentReflections: recentReflectionsRes.data ?? [],
  };
}

/**
 * Formats recent workspace documents into a string suitable for AI prompts.
 * Truncates content to avoid overwhelming the context window.
 */
export function formatDocsForPrompt(
  docs: { title: string | null; content: string | null; doc_type?: string | null }[]
): string {
  if (!docs?.length) return 'No recent workspace notes.';

  return docs
    .map((doc, idx) => {
      const title = doc.title || `Document ${idx + 1}`;
      const docType = doc.doc_type ? ` (${doc.doc_type})` : '';
      const content = (doc.content || '').slice(0, 500).trim();
      const truncated = content.length >= 500 ? '...' : '';
      return `- [${title}${docType}]: ${content}${truncated}`;
    })
    .join('\n');
}

/**
 * Formats recent reflections into a string suitable for AI prompts.
 * Provides emotional/energy context from recent check-ins.
 */
export function formatReflectionsForPrompt(
  reflections: {
    reflection_date: string;
    ai_summary?: string | null;
    ai_theme?: string | null;
    energy_level?: number | null;
    stress_level?: number | null;
    mood_tags?: string[] | null;
    what_did?: string | null;
    top_priority?: string | null;
  }[]
): string {
  if (!reflections?.length) return 'No recent reflections.';

  return reflections
    .slice(0, 5) // Limit to 5 most recent
    .map((r) => {
      const date = r.reflection_date;
      const theme = r.ai_theme ? `Theme: "${r.ai_theme}"` : '';
      const energy = r.energy_level ? `Energy: ${r.energy_level}/5` : '';
      const stress = r.stress_level ? `Stress: ${r.stress_level}/5` : '';
      const moods = r.mood_tags?.length ? `Mood: ${r.mood_tags.slice(0, 3).join(', ')}` : '';
      const summary = r.ai_summary ? r.ai_summary.slice(0, 200) : '';
      
      const parts = [theme, energy, stress, moods].filter(Boolean).join(' | ');
      return `- [${date}] ${parts}${summary ? `\n  ${summary}` : ''}`;
    })
    .join('\n');
}

/**
 * Builds a condensed context summary for AI prompts.
 * This is the main function to use when you need to inject user context into prompts.
 */
export function buildContextSummaryForPrompt(context: UserContext): string {
  const sections: string[] = [];

  // Profile summary
  if (context.profile) {
    const p = context.profile;
    sections.push(`## Founder Profile
- Passions: ${p.passions_text || p.passions_tags?.join(', ') || 'Not specified'}
- Skills: ${p.skills_text || p.skills_tags?.join(', ') || 'Not specified'}
- Time available: ${p.time_per_week ? `${p.time_per_week} hrs/week` : 'Not specified'}
- Capital: ${p.capital_available ? `$${p.capital_available}` : 'Not specified'}
- Risk tolerance: ${p.risk_tolerance || 'Not specified'}
- Vision: ${p.success_vision?.slice(0, 300) || 'Not specified'}`);
  }

  // Extended intake (psychographic data)
  if (context.extendedIntake) {
    const e = context.extendedIntake;
    const parts: string[] = [];
    if (e.deep_desires) parts.push(`Desires: ${e.deep_desires.slice(0, 200)}`);
    if (e.fears) parts.push(`Fears: ${e.fears.slice(0, 200)}`);
    if (e.energy_givers) parts.push(`Energized by: ${e.energy_givers.slice(0, 150)}`);
    if (e.energy_drainers) parts.push(`Drained by: ${e.energy_drainers.slice(0, 150)}`);
    if (parts.length) {
      sections.push(`## Deeper Self-Knowledge\n${parts.join('\n')}`);
    }
  }

  // Chosen idea
  if (context.chosenIdea) {
    const i = context.chosenIdea;
    sections.push(`## Current Focus Idea
- Title: ${i.title}
- Description: ${i.description?.slice(0, 300) || 'No description'}
- Business model: ${i.business_model_type || 'Not specified'}
- Target customer: ${i.target_customer || 'Not specified'}
- Fit score: ${i.overall_fit_score || 'Not scored'}/100`);
  }

  // Idea analysis
  if (context.ideaAnalysis) {
    const a = context.ideaAnalysis;
    sections.push(`## Idea Analysis
- Niche score: ${a.niche_score || 'N/A'}/100
- Market insight: ${a.market_insight?.slice(0, 200) || 'N/A'}
- Problem intensity: ${a.problem_intensity || 'N/A'}
- Elevator pitch: ${a.elevator_pitch?.slice(0, 200) || 'N/A'}`);
  }

  // Recent workspace notes
  if (context.recentDocs?.length) {
    sections.push(`## Recent Workspace Notes\n${formatDocsForPrompt(context.recentDocs)}`);
  }

  // Recent reflections
  if (context.recentReflections?.length) {
    sections.push(`## Recent Check-ins & Reflections\n${formatReflectionsForPrompt(context.recentReflections)}`);
  }

  return sections.join('\n\n');
}
