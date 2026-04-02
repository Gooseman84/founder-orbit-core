import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Maps new interview schema to old-style fields so the prompt builder works unchanged.
 * Handles both old-schema interviews (extractedInsights) and new-schema (domainExpertise/customerPain).
 */
function normalizeContextSummary(ctx: any): any {
  if (!ctx) return {};

  // Old schema already has extractedInsights — return as-is
  if (ctx.extractedInsights) return ctx;

  // New schema — map to old field structure
  const domain = ctx.domainExpertise || {};
  const pain = ctx.customerPain || {};
  const signal = ctx.interviewSignalQuality || {};

  return {
    ...ctx,
    extractedInsights: {
      insiderKnowledge: domain.specificKnowledge || [],
      customerIntimacy: [pain.targetRole, pain.specificProblem].filter(Boolean),
      constraints: {},
      financialTarget: { type: "see_profile", minimumMonthlyRevenue: 0, description: "" },
      hardNoFilters: [],
      emotionalDrivers: [],
      domainExpertise: [domain.primaryIndustry, domain.abstractExpertise].filter(Boolean),
      transferablePatterns: ctx.transferablePatterns || [],
      networkDistribution: {},
    },
    confidenceLevel: {
      insiderKnowledge: signal.insiderKnowledge || "low",
      customerIntimacy: signal.customerPain || "low",
      constraints: "high",
      financialTarget: "high",
    },
    ventureIntelligence: ctx.ventureIntelligence || {},
  };
}

interface RequestBody {
  interviewId: string;
}

interface FitBreakdown {
  founderMarketFit: number;
  feasibility: number;
  revenueAlignment: number;
  marketTiming: number;
}

interface Recommendation {
  name: string;
  oneLiner: string;
  whyThisFounder: string;
  targetCustomer: string;
  revenueModel: string;
  timeToFirstRevenue: string;
  capitalRequired: string;
  fitScore: number;
  fitBreakdown: FitBreakdown;
  keyRisk: string;
  firstStep: string;
}

interface GenerationResult {
  recommendations: Recommendation[];
  generationNotes: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Extract and verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client for auth verification
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Verify JWT server-side
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Parse request body
    const body: RequestBody = await req.json();
    const { interviewId } = body;

    if (!interviewId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: interviewId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the completed interview
    const { data: interview, error: interviewError } = await supabaseAuth
      .from("founder_interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", userId)
      .eq("status", "completed")
      .single();

    if (interviewError || !interview) {
      return new Response(
        JSON.stringify({ error: "Completed interview not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!interview.context_summary) {
      return new Response(
        JSON.stringify({ error: "Interview has no context summary" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch founder profile
    const { data: profile, error: profileError } = await supabaseAuth
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.warn("Could not fetch founder profile:", profileError);
      // Continue without profile data
    }

    const contextSummary = interview.context_summary as any;
    const normalizedSummary = normalizeContextSummary(contextSummary);
    
    // Build the system prompt
    const systemPrompt = buildIdeaGenerationPrompt(normalizedSummary, profile);

    // Call Lovable AI gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate personalized venture ideas for this founder based on their interview. Return only valid JSON." },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error("generate-personalized-ideas: AI gateway error:", status);
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "AI rate limit exceeded, please wait and try again.", code: "rate_limited" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to generate ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "";

    let response: GenerationResult | null = null;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      response = JSON.parse(jsonMatch[0]) as GenerationResult;
      if (!response.recommendations || !Array.isArray(response.recommendations)) {
        throw new Error("Invalid response structure: missing recommendations array");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ error: "Failed to generate ideas. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sort by fitScore descending
    response.recommendations.sort((a, b) => b.fitScore - a.fitScore);

    // Clean up any previously auto-saved ideas from this interview
    // so regeneration doesn't create duplicates
    const { error: cleanupError } = await supabaseAuth
      .from("ideas")
      .delete()
      .eq("user_id", userId)
      .eq("source_type", "generated")
      .filter("source_meta->>source", "eq", "mavrik_recommendation")
      .filter("source_meta->>interview_id", "eq", interviewId);

    if (cleanupError) {
      console.warn("Failed to clean up old auto-saved ideas:", cleanupError);
    }

    // Store results in personalized_recommendations
    const { data: savedRec, error: saveError } = await supabaseAuth
      .from("personalized_recommendations")
      .insert({
        user_id: userId,
        interview_id: interviewId,
        recommendations: response.recommendations,
        generation_notes: response.generationNotes || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save recommendations:", saveError);
    }

    // Auto-save each recommendation as an idea in the ideas table
    const ideaInserts = response.recommendations.map((rec: Recommendation) => ({
      user_id: userId,
      title: rec.name,
      description: rec.oneLiner,
      source_type: "generated" as const,
      source_meta: {
        source: "mavrik_recommendation",
        interview_id: interviewId,
        recommendation_id: savedRec?.id || null,
        whyThisFounder: rec.whyThisFounder,
        targetCustomer: rec.targetCustomer,
        revenueModel: rec.revenueModel,
        timeToFirstRevenue: rec.timeToFirstRevenue,
        capitalRequired: rec.capitalRequired,
        fitScore: rec.fitScore,
        fitBreakdown: rec.fitBreakdown,
        keyRisk: rec.keyRisk,
        firstStep: rec.firstStep,
      },
      overall_fit_score: rec.fitScore,
      target_customer: rec.targetCustomer,
      status: "candidate",
    }));

    const { error: ideasInsertError } = await supabaseAuth
      .from("ideas")
      .insert(ideaInserts);

    if (ideasInsertError) {
      console.error("Failed to auto-save ideas to library:", ideasInsertError);
    } else {
      console.log(`Auto-saved ${ideaInserts.length} Mavrik ideas to ideas table`);
    }

    const generationTimeMs = Date.now() - startTime;
    console.log(`Ideas generated in ${generationTimeMs}ms for user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: response.recommendations,
        generationNotes: response.generationNotes,
        recommendationId: savedRec?.id || null,
        generationTimeMs,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in generate-personalized-ideas:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildIdeaGenerationPrompt(contextSummary: any, profile: any): string {
  const extractedInsights = contextSummary.extractedInsights || {};
  const confidenceLevel = contextSummary.confidenceLevel || {};
  const ideaGenerationContext = contextSummary.ideaGenerationContext || "";

  return `You are a venture strategist at TrueBlazer. A founder has just completed a discovery interview. Your job is to generate 3-5 personalized business ideas ranked by how well they fit THIS SPECIFIC FOUNDER.

FOUNDER PROFILE (from interview synthesis):
${ideaGenerationContext}

ONBOARDING DATA:
- Business type interest: ${profile?.business_type_preference || "Not specified"}
- Energy source: ${profile?.energy_source || "Not specified"}
- Commitment level: ${profile?.commitment_level_text || "Not specified"}
- Future vision: ${profile?.future_vision || "Not specified"}

LIGHTNING ROUND CONSTRAINTS (NON-NEGOTIABLE — filter every idea through these):
- Available hours per week: ${profile?.hours_per_week ?? "not specified"}
- Available startup capital: $${profile?.capital_available ?? "not specified"}
- Risk tolerance: ${profile?.risk_tolerance ?? "not specified"}
- Work personality: ${Array.isArray(profile?.work_personality) ? profile.work_personality.join(", ") : (profile?.work_personality ?? "not specified")}
- Lifestyle goals: ${profile?.lifestyle_goals ?? "not specified"}
- Hard NO filters (reject any idea that involves these): ${Array.isArray(profile?.hell_no_filters) ? profile.hell_no_filters.join(", ") : (profile?.hell_no_filters ?? "none")}

CRITICAL CONSTRAINT RULES: Do not recommend any idea that violates the hard NO filters or requires more capital or weekly hours than stated. If capital is under $1,000, exclude ideas requiring paid advertising, inventory, or upfront hires. Adjust timeToFirstRevenue and capitalRequired fields to reflect these actual constraints.

EXTRACTED INSIGHTS:
${JSON.stringify(extractedInsights, null, 2)}

TRANSFERABLE PATTERNS:
${JSON.stringify(extractedInsights?.transferablePatterns || [], null, 2)}

PATTERN TRANSFER POTENTIAL: ${contextSummary?.ventureIntelligence?.patternTransferPotential || 'not assessed'}
ABSTRACT EXPERTISE: ${contextSummary?.ventureIntelligence?.abstractExpertise || 'not identified'}

CONFIDENCE LEVELS:
${JSON.stringify(confidenceLevel, null, 2)}

INSTRUCTIONS:
Generate exactly 5 venture ideas. For dimensions where confidence is "low", generate broader ideas for that dimension. For "high" confidence dimensions, be highly specific.

For EACH idea, provide:

1. name: A catchy, memorable 2-4 word name
2. oneLiner: One sentence pitch (under 20 words)
3. whyThisFounder: 2-3 sentences explaining why THIS specific founder is uniquely positioned for this idea. Reference their specific insider knowledge, customer intimacy, or domain expertise. Be concrete.
4. targetCustomer: Who pays. Be specific (not "businesses" but "independent insurance agents with 5-20 clients")
5. revenueModel: How they make money (subscription, one-time, marketplace, etc.) with estimated price point
6. timeToFirstRevenue: Realistic estimate given their stated hours/week and capital constraints
7. capitalRequired: Estimated upfront investment needed
8. fitScore: 0-100 composite score based on:
   - founderMarketFit (40% weight)
   - feasibilityGivenConstraints (30% weight)
   - revenueAlignment (20% weight)
   - marketTiming (10% weight)
9. fitBreakdown: {
     founderMarketFit: <0-100>,
     feasibility: <0-100>,
     revenueAlignment: <0-100>,
     marketTiming: <0-100>
   }
10. keyRisk: The #1 thing that could kill this idea (be honest, not cheerful)
11. firstStep: The single most important action to validate this idea in the next 7 days

RANKING: Order by fitScore descending.

CRITICAL RULES:
- Every idea MUST connect to the founder's specific expertise. No generic
  "build an AI tool" suggestions.
- At least 1 idea (and ideally 2) should be a PATTERN TRANSFER idea —
  applying the founder's core skill to an ADJACENT industry they may
  not have considered. Use the transferablePatterns from the interview
  summary to identify these.
- Pattern transfer ideas should clearly explain WHY the founder's
  expertise translates (don't just name a random industry — show the
  structural similarity).
- Label pattern transfer ideas with a "💡 Adjacent Opportunity" tag in
  the whyThisFounder field so the founder understands this is a
  cross-industry play.
- The remaining ideas should be within the founder's primary domain.
- Ideas must be feasible within the founder's stated constraints
- If the founder said they won't do something, don't recommend it
- Revenue timelines must be realistic, not optimistic
- Include at least one "safe bet" (lower risk, faster revenue) and
  one "swing for the fences" (higher risk, bigger potential)

Return ONLY valid JSON with this exact structure:
{
  "recommendations": [
    {
      "name": "string",
      "oneLiner": "string",
      "whyThisFounder": "string",
      "targetCustomer": "string",
      "revenueModel": "string",
      "timeToFirstRevenue": "string",
      "capitalRequired": "string",
      "fitScore": number,
      "fitBreakdown": {
        "founderMarketFit": number,
        "feasibility": number,
        "revenueAlignment": number,
        "marketTiming": number
      },
      "keyRisk": "string",
      "firstStep": "string"
    }
  ],
  "generationNotes": "Any caveats about the recommendations based on low-confidence areas"
}`;
}
