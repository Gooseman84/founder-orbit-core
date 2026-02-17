import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Create Supabase client with user's auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

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
    
    // Build the system prompt
    const systemPrompt = buildIdeaGenerationPrompt(contextSummary, profile);

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    
    let response: GenerationResult | null = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts && !response) {
      attempts++;
      
      try {
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: "Generate personalized venture ideas for this founder based on their interview. Return only valid JSON.",
            },
          ],
        });

        // Extract response text
        const responseText = message.content
          .filter((block): block is Anthropic.TextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        // Parse JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("No JSON found in response");
        }
        
        response = JSON.parse(jsonMatch[0]) as GenerationResult;
        
        // Validate structure
        if (!response.recommendations || !Array.isArray(response.recommendations)) {
          throw new Error("Invalid response structure: missing recommendations array");
        }
        
      } catch (parseError) {
        console.error(`Attempt ${attempts} failed:`, parseError);
        
        if (attempts >= maxAttempts) {
          return new Response(
            JSON.stringify({ 
              error: "Failed to generate ideas. Please try again.",
              details: parseError instanceof Error ? parseError.message : "Unknown error"
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Will retry with stricter formatting in next iteration
      }
    }

    if (!response) {
      return new Response(
        JSON.stringify({ error: "Failed to generate ideas after multiple attempts" }),
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
