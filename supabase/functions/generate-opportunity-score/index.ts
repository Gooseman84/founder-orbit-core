import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPPORTUNITY_SCORE_PROMPT = `You are TrueBlazer.AI v6 — an elite startup evaluator combining YC, Sequoia, Christensen, and modern AI entrepreneurship frameworks.

Your job: Score a business idea on core opportunity dimensions PLUS v6 leverage/virality dimensions.

Input JSON:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... }
}

SCORING PHILOSOPHY:
- For content/creator/memetic ideas → virality + culture_tailwinds matter MORE
- For automation/system ideas → leverage + automation_density + autonomy_level matter MORE
- For traditional SaaS/service → founder_fit + market_size + pain_intensity matter MORE

You MUST respond with STRICT JSON containing:

{
  "total_score": number,       // 0–100 (weighted composite)
  "sub_scores": {
    "founder_fit": number,     // 0–100 (passions, skills, constraints alignment)
    "market_size": number,     // 0–100 (TAM implied)
    "pain_intensity": number,  // 0–100 (urgency + willingness to pay)
    "competition": number,     // 0–100 (lower competition = higher score)
    "difficulty": number,      // 0–100 (lower difficulty = higher score for THIS founder)
    "tailwinds": number,       // 0–100 (industry/tech/regulatory forces)
    "virality": number,        // 0–100 (shareability, network effects, organic spread potential)
    "leverage": number,        // 0–100 (automation + margins + scale potential)
    "automation_density": number, // 0–100 (how much can run without human touch)
    "autonomy_level": number,  // 0–100 (how hands-off the founder can become)
    "culture_tailwinds": number // 0–100 (aligned with current cultural moments, memes, behaviors)
  },
  "explanation": "string",
  "recommendations": ["string"]
}

Scoring rules:
- founder_fit: passions, skills, constraints match
- market_size: implied TAM from idea + analysis
- pain_intensity: urgency + willingness to pay
- competition: intensity of existing solutions (lower = higher score)
- difficulty: how hard it is for THIS founder (lower = higher score)
- tailwinds: industry, tech, or cultural forces accelerating success
- virality: shareability, network effects, organic growth potential (high for memetic/creator ideas)
- leverage: automation + margins + scale (high for system/automation ideas)
- automation_density: how much runs without human touch
- autonomy_level: how hands-off the founder can become over time
- culture_tailwinds: alignment with current cultural moments, memes, platform behaviors

For total_score weighting:
- Base: 50% from (founder_fit + market_size + pain_intensity + competition + difficulty + tailwinds)/6
- V6 bonus: 50% from (virality + leverage + automation_density + autonomy_level + culture_tailwinds)/5
- Blend based on idea category (creator/memetic weight v6 higher, traditional weight base higher)

DO NOT return commentary. JSON only.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY') ?? '';

    // ===== AUTH: Require Authorization header =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== TWO CLIENTS: Auth (anon key + persistSession:false) + Admin (service role) =====
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader.trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== VERIFY USER via supabaseAuth.auth.getUser(token) =====
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('[generate-opportunity-score] auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log('[generate-opportunity-score] Authenticated user:', userId);

    // Parse request body for ideaId only
    const { ideaId } = await req.json();
    console.log('[generate-opportunity-score] Processing for authenticated userId:', userId, 'ideaId:', ideaId);

    if (!ideaId) {
      return new Response(
        JSON.stringify({ error: 'ideaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Server-side subscription validation
    console.log('[generate-opportunity-score] Checking subscription...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .single();

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: 'upgrade_required', message: 'Pro subscription required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPro = subscription.plan === 'pro' || subscription.plan === 'founder';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';

    if (!isPro || !isActive) {
      return new Response(
        JSON.stringify({ error: 'upgrade_required', message: 'Active Pro subscription required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build input using data from database
    console.log('[generate-opportunity-score] Building input data...');
    const input = await buildOpportunityInput(supabase, userId, ideaId);
    console.log('[generate-opportunity-score] Input size:', JSON.stringify(input).length, 'chars');

    // Call Lovable AI
    console.log('[generate-opportunity-score] Calling AI...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: OPPORTUNITY_SCORE_PROMPT },
          { role: 'user', content: JSON.stringify(input) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "score_opportunity",
              description: "Return opportunity score with v6 breakdown including virality and leverage dimensions",
              parameters: {
                type: "object",
                properties: {
                  total_score: { type: "number" },
                  sub_scores: {
                    type: "object",
                    properties: {
                      founder_fit: { type: "number" },
                      market_size: { type: "number" },
                      pain_intensity: { type: "number" },
                      competition: { type: "number" },
                      difficulty: { type: "number" },
                      tailwinds: { type: "number" },
                      virality: { type: "number" },
                      leverage: { type: "number" },
                      automation_density: { type: "number" },
                      autonomy_level: { type: "number" },
                      culture_tailwinds: { type: "number" }
                    },
                    required: ["founder_fit", "market_size", "pain_intensity", "competition", "difficulty", "tailwinds", "virality", "leverage", "automation_density", "autonomy_level", "culture_tailwinds"],
                    additionalProperties: false
                  },
                  explanation: { type: "string" },
                  recommendations: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["total_score", "sub_scores", "explanation", "recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "score_opportunity" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-opportunity-score] AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    console.log('[generate-opportunity-score] AI response received');

    // Extract tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    let scoreData;
    try {
      scoreData = JSON.parse(toolCall.function.arguments);
      console.log('[generate-opportunity-score] Parsed score data:', scoreData);
    } catch (parseError) {
      console.error('[generate-opportunity-score] JSON parse error:', parseError);
      throw new Error('Failed to parse AI response JSON');
    }

    // Validate response
    const validatedScore = validateScoreResponse(scoreData);
    console.log('[generate-opportunity-score] Validated score:', validatedScore);

    // Insert into database
    const { data: insertedScore, error: insertError } = await supabase
      .from('opportunity_scores')
      .insert({
        user_id: userId,
        idea_id: ideaId,
        total_score: validatedScore.total_score,
        sub_scores: validatedScore.sub_scores,
        explanation: validatedScore.explanation,
        recommendations: validatedScore.recommendations,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[generate-opportunity-score] Insert error:', insertError);
      throw insertError;
    }

    console.log('[generate-opportunity-score] Score inserted successfully');

    return new Response(
      JSON.stringify(insertedScore),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('[generate-opportunity-score] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper functions

async function buildOpportunityInput(supabase: any, userId: string, ideaId: string) {
  // Load founder profile
  const { data: founderProfile, error: profileError } = await supabase
    .from("founder_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError || !founderProfile) {
    throw new Error("Founder profile not found");
  }

  // Load idea
  const { data: idea, error: ideaError } = await supabase
    .from("ideas")
    .select("*")
    .eq("id", ideaId)
    .eq("user_id", userId)
    .single();

  if (ideaError || !idea) {
    throw new Error("Idea not found");
  }

  // Load latest idea analysis
  const { data: analysis, error: analysisError } = await supabase
    .from("idea_analysis")
    .select("*")
    .eq("idea_id", ideaId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (analysisError || !analysis) {
    throw new Error("Idea analysis not found");
  }

  return {
    founder_profile: {
      passions_text: founderProfile.passions_text,
      passions_tags: founderProfile.passions_tags,
      skills_text: founderProfile.skills_text,
      skills_tags: founderProfile.skills_tags,
      tech_level: founderProfile.tech_level,
      time_per_week: founderProfile.time_per_week,
      capital_available: founderProfile.capital_available,
      risk_tolerance: founderProfile.risk_tolerance,
      lifestyle_goals: founderProfile.lifestyle_goals,
      success_vision: founderProfile.success_vision,
      // v6 fields
      work_personality: founderProfile.work_personality,
      creator_platforms: founderProfile.creator_platforms,
      edgy_mode: founderProfile.edgy_mode,
      wants_money_systems: founderProfile.wants_money_systems,
      open_to_personas: founderProfile.open_to_personas,
      open_to_memetic_ideas: founderProfile.open_to_memetic_ideas,
    },
    idea: {
      title: idea.title,
      description: idea.description,
      business_model_type: idea.business_model_type,
      target_customer: idea.target_customer,
      time_to_first_dollar: idea.time_to_first_dollar,
      complexity: idea.complexity,
      // v6 fields
      category: idea.category,
      mode: idea.mode,
      platform: idea.platform,
      shock_factor: idea.shock_factor,
      virality_potential: idea.virality_potential,
      leverage_score: idea.leverage_score,
      automation_density: idea.automation_density,
      autonomy_level: idea.autonomy_level,
      culture_tailwind: idea.culture_tailwind,
      chaos_factor: idea.chaos_factor,
      engine_version: idea.engine_version,
    },
    analysis: {
      niche_score: analysis.niche_score,
      market_insight: analysis.market_insight,
      problem_intensity: analysis.problem_intensity,
      competition_snapshot: analysis.competition_snapshot,
      pricing_power: analysis.pricing_power,
      success_likelihood: analysis.success_likelihood,
      biggest_risks: analysis.biggest_risks,
      unfair_advantages: analysis.unfair_advantages,
      recommendations: analysis.recommendations,
      brutal_honesty: analysis.brutal_honesty,
    },
  };
}

function validateScoreResponse(rawJson: any) {
  if (!rawJson || typeof rawJson !== "object") {
    throw new Error("Invalid score response");
  }

  let totalScore = rawJson.total_score;
  if (typeof totalScore !== "number" || isNaN(totalScore)) {
    totalScore = 0;
  }
  totalScore = Math.max(0, Math.min(100, totalScore));

  const subScores = rawJson.sub_scores || {};
  const validatedSubScores = {
    // Core scores
    founder_fit: validateSubScore(subScores.founder_fit),
    market_size: validateSubScore(subScores.market_size),
    pain_intensity: validateSubScore(subScores.pain_intensity),
    competition: validateSubScore(subScores.competition),
    difficulty: validateSubScore(subScores.difficulty),
    tailwinds: validateSubScore(subScores.tailwinds),
    // V6 scores
    virality: validateSubScore(subScores.virality),
    leverage: validateSubScore(subScores.leverage),
    automation_density: validateSubScore(subScores.automation_density),
    autonomy_level: validateSubScore(subScores.autonomy_level),
    culture_tailwinds: validateSubScore(subScores.culture_tailwinds),
  };

  let explanation = rawJson.explanation;
  if (typeof explanation !== "string" || !explanation.trim()) {
    explanation = "No explanation provided.";
  }

  let recommendations = rawJson.recommendations;
  if (!Array.isArray(recommendations)) {
    recommendations = [];
  }
  recommendations = recommendations
    .filter((r: any) => typeof r === "string" && r.trim())
    .map((r: string) => r.trim());

  if (recommendations.length === 0) {
    recommendations = ["Continue validating this opportunity with real customer conversations."];
  }

  return {
    total_score: totalScore,
    sub_scores: validatedSubScores,
    explanation: explanation.trim(),
    recommendations,
  };
}

function validateSubScore(value: any): number {
  if (typeof value !== "number" || isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value));
}
