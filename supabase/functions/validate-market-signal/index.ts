import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MarketSignalRequest {
  idea_title: string;
  idea_description: string;
  target_customer?: string;
  founder_domain?: string;
}

interface DemandSignal {
  source: string;
  quote: string;
  relevance: string;
}

interface Competitor {
  name: string;
  what_they_do: string;
  weakness: string;
  pricing: string;
}

interface MarketValidationResult {
  demand_signals: DemandSignal[];
  competitor_landscape: Competitor[];
  market_timing: "growing" | "stable" | "declining";
  validation_score: number;
  reality_check: string;
  sources: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse & validate input
    const body: MarketSignalRequest = await req.json();
    if (!body.idea_title || !body.idea_description) {
      return new Response(JSON.stringify({ error: 'idea_title and idea_description are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: 'PERPLEXITY_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Run two Perplexity searches in parallel: demand signals + competitor landscape
    const customerContext = body.target_customer ? ` targeting ${body.target_customer}` : '';
    const domainContext = body.founder_domain ? ` in the ${body.founder_domain} industry` : '';

    const [demandResponse, competitorResponse] = await Promise.all([
      // Search 1: Demand signals — real complaints and pain points
      fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a market research analyst. Search for real complaints, frustrations, and unmet needs related to the given business idea. Focus on Reddit, forums, G2 reviews, Capterra reviews, and social media. Return only verifiable signals from real sources. Be specific with quotes and sources.'
            },
            {
              role: 'user',
              content: `Find real demand signals for this business idea:

Title: ${body.idea_title}
Description: ${body.idea_description}${customerContext}${domainContext}

Search for:
1. Real complaints or frustrations people have expressed online about this problem
2. Existing forum threads or discussions showing demand
3. Review site complaints about current solutions
4. Social media posts expressing this pain point

Return a JSON object with this exact structure:
{
  "signals": [
    {
      "source": "source name (e.g. r/smallbusiness, G2 review of X)",
      "quote": "actual quote or paraphrase of the complaint",
      "relevance": "how this validates the idea"
    }
  ],
  "overall_demand": "high" | "medium" | "low" | "unclear",
  "demand_summary": "2-3 sentence summary of demand evidence"
}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          return_citations: true,
        }),
      }),

      // Search 2: Competitor landscape
      fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: 'You are a competitive intelligence analyst. Find existing competitors and alternatives for the given business idea. Focus on pricing, weaknesses, and market gaps. Be factual and specific.'
            },
            {
              role: 'user',
              content: `Find competitors and market timing for this business idea:

Title: ${body.idea_title}
Description: ${body.idea_description}${customerContext}${domainContext}

Search for:
1. Direct competitors offering similar solutions
2. Indirect competitors or workarounds people currently use
3. Their pricing, weaknesses, and user complaints
4. Whether this market is growing, stable, or declining

Return a JSON object with this exact structure:
{
  "competitors": [
    {
      "name": "competitor name",
      "what_they_do": "brief description",
      "weakness": "key weakness or gap",
      "pricing": "pricing info if available"
    }
  ],
  "market_timing": "growing" | "stable" | "declining",
  "timing_rationale": "why the market is in this state",
  "gap_analysis": "what's missing from current solutions"
}`
            }
          ],
          temperature: 0.1,
          max_tokens: 2000,
          return_citations: true,
        }),
      }),
    ]);

    if (!demandResponse.ok || !competitorResponse.ok) {
      const errText = !demandResponse.ok
        ? await demandResponse.text()
        : await competitorResponse.text();
      console.error('Perplexity API error:', errText);
      return new Response(JSON.stringify({ error: 'Market research API error', details: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const demandData = await demandResponse.json();
    const competitorData = await competitorResponse.json();

    // Extract citations
    const allCitations: string[] = [
      ...(demandData.citations || []),
      ...(competitorData.citations || []),
    ];

    // Parse AI responses (with fallbacks for malformed JSON)
    const demandContent = demandData.choices?.[0]?.message?.content || '{}';
    const competitorContent = competitorData.choices?.[0]?.message?.content || '{}';

    let demandParsed: Record<string, unknown>;
    let competitorParsed: Record<string, unknown>;

    try {
      demandParsed = JSON.parse(extractJson(demandContent));
    } catch {
      console.error('Failed to parse demand response:', demandContent);
      demandParsed = { signals: [], overall_demand: 'unclear', demand_summary: demandContent };
    }

    try {
      competitorParsed = JSON.parse(extractJson(competitorContent));
    } catch {
      console.error('Failed to parse competitor response:', competitorContent);
      competitorParsed = { competitors: [], market_timing: 'stable', gap_analysis: competitorContent };
    }

    // Calculate validation score
    const signals = (demandParsed.signals as DemandSignal[]) || [];
    const competitors = (competitorParsed.competitors as Competitor[]) || [];
    const overallDemand = (demandParsed.overall_demand as string) || 'unclear';
    const marketTiming = (competitorParsed.market_timing as string) || 'stable';

    let score = 50; // Base score

    // Demand signals boost
    if (signals.length >= 5) score += 20;
    else if (signals.length >= 3) score += 15;
    else if (signals.length >= 1) score += 8;
    else score -= 15;

    // Demand strength
    if (overallDemand === 'high') score += 15;
    else if (overallDemand === 'medium') score += 5;
    else if (overallDemand === 'low') score -= 10;

    // Market timing
    if (marketTiming === 'growing') score += 10;
    else if (marketTiming === 'declining') score -= 15;

    // Competition analysis
    if (competitors.length === 0) score += 5; // Blue ocean (but verify)
    else if (competitors.length <= 3) score += 5; // Some validation
    else if (competitors.length > 6) score -= 5; // Crowded

    score = Math.max(0, Math.min(100, score));

    // Build reality check
    const demandSummary = (demandParsed.demand_summary as string) || '';
    const gapAnalysis = (competitorParsed.gap_analysis as string) || '';
    const realityCheck = buildRealityCheck(signals.length, competitors.length, overallDemand, marketTiming, demandSummary, gapAnalysis);

    const result: MarketValidationResult = {
      demand_signals: signals.slice(0, 8), // Cap at 8
      competitor_landscape: competitors.slice(0, 6), // Cap at 6
      market_timing: (['growing', 'stable', 'declining'].includes(marketTiming) ? marketTiming : 'stable') as MarketValidationResult['market_timing'],
      validation_score: score,
      reality_check: realityCheck,
      sources: [...new Set(allCitations)].slice(0, 10),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('validate-market-signal error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/** Extract JSON from a string that may contain markdown code fences */
function extractJson(text: string): string {
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];
  return text;
}

/** Build a concise reality check summary */
function buildRealityCheck(
  signalCount: number,
  competitorCount: number,
  demand: string,
  timing: string,
  demandSummary: string,
  gapAnalysis: string,
): string {
  const parts: string[] = [];

  if (demand === 'high' && signalCount >= 3) {
    parts.push(`Strong signal: ${signalCount} real demand indicators found.`);
  } else if (demand === 'medium') {
    parts.push(`Moderate signal: some demand evidence exists but needs further validation.`);
  } else if (demand === 'low' || signalCount === 0) {
    parts.push(`Weak signal: limited evidence of real demand found online.`);
  }

  if (competitorCount === 0) {
    parts.push('No direct competitors found — could be a blue ocean or an unproven market.');
  } else if (competitorCount <= 3) {
    parts.push(`${competitorCount} competitor(s) found — market is validated but not saturated.`);
  } else {
    parts.push(`${competitorCount} competitors found — crowded market, differentiation is critical.`);
  }

  if (timing === 'growing') {
    parts.push('Market timing is favorable — growth trend detected.');
  } else if (timing === 'declining') {
    parts.push('Caution: market appears to be declining.');
  }

  if (gapAnalysis) {
    parts.push(gapAnalysis);
  }

  return parts.join(' ');
}
