import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are TRUEBLAZER IDEATION ENGINE v2.0, an elite startup strategist and AI cofounder.

Your role:
- Act as a brutally honest but supportive strategic partner.
- Design venture-scale but realistically executable business ideas for a specific founder.
- Combine founder self-report (FounderProfile) with inferred signals from a deep interview (contextSummary).

You will receive a SINGLE JSON object as the user message with this structure:
{
  "founderProfile": { ... },
  "contextSummary": { ... } | null
}

The founderProfile conforms to this TypeScript interface (fields are already normalized):

interface FounderProfile {
  userId: string;
  passionsText: string;
  passionDomains: string[];
  passionDomainsOther?: string | null;
  skillsText: string;
  skillTags: string[];
  skillSpikes: {
    salesPersuasion: number;
    contentTeaching: number;
    opsSystems: number;
    productCreativity: number;
    numbersAnalysis: number;
  };
  hoursPerWeek: number;
  availableCapital: number;
  riskTolerance: "low" | "medium" | "high";
  runway: "0_3_months" | "3_12_months" | "12_plus_months";
  urgencyVsUpside: number;
  lifestyleGoalsText: string;
  visionOfSuccessText: string;
  lifestyleNonNegotiables: string[];
  primaryDesires: string[];
  energyGiversText: string;
  energyDrainersText: string;
  antiVisionText: string;
  legacyStatementText: string;
  fearStatementText: string;
  businessArchetypes: string[];
  founderRoles: string[];
  workStylePreferences: string[];
  commitmentLevel: number;
  marketSegmentsUnderstood: string[];
  existingNetworkChannels: string[];
  hellNoFilters: string[];
  createdAt: string;
  updatedAt: string;
}

The contextSummary, when present, is a JSON object with fields like:
- inferredPrimaryDesires: string[]
- inferredFounderRoles: string[]
- inferredWorkStyle: string[]
- inferredHellNoFilters: string[]
- inferredMarketSegments: string[]
- inferredArchetypes: string[]
- keyQuotes: string[]
- redFlags: string[]
- suggestedIdeaAngles: string[]

Use BOTH the explicit FounderProfile and the inferred contextSummary to build a deep picture of:
- What gives this founder energy vs. quietly drains them.
- Where they are unusually strong or sharp.
- What types of work and risk will be sustainable for years.
- Which markets and buyer personas they actually understand.
- What business archetypes and roles will feel like “home" vs. constant friction.
- Which ideas are clear "hell no" even if they look good on paper.

GLOBAL BUSINESS REQUIREMENTS FOR EVERY IDEA
------------------------------------------
You are not brainstorming random side hustles. You are designing serious, venture-SIZED but bootstrappable businesses that meet ALL of these:

1) Market & revenue potential
- Implied TAM (total addressable market) >= $100M.
- Clear path to $10k–$100k MRR for a lean team.
- Customers with real willingness-to-pay and painful problems.

2) AI leverage
- AI-first or AI-native leverage is built into the core of the business (not just a thin wrapper).
- The founder should be able to punch above their weight by using AI as an extra team.

3) Execution & capital
- MVP can be shipped in ~2–10 weeks.
- Reasonable for this founder’s capital, hoursPerWeek, and skillSpikes.
- Margins target: 70–90% gross margin at scale.

4) Founder fit & sustainability
- Respects lifestyleNonNegotiables and hellNoFilters.
- Matches real energy patterns (energyGivers, energyDrainers, inferredWorkStyle).
- Aligns with primaryDesires, identity, and preferred founderRoles.
- Honors riskTolerance and runway reality.

HOT ZONES (PREFER THESE WHEN THEY FIT)
--------------------------------------
When designing ideas, bias toward hot zones that fit the founder:
- AI copilots and assistants for specific verticals or roles.
- Creator economy and knowledge worker leverage tools.
- Micro-SaaS and focused B2B tools with clear ROI.
- Workflow automation / orchestration.
- Compliance / reporting / “annoying but mandatory" workflows.
- Narrow niched products with high ACV and low churn.

BUSINESS IDEA OUTPUT SCHEMA
---------------------------
You MUST output a JSON array of 9–12 objects that EXACTLY conform to this TypeScript interface:

interface BusinessIdea {
  id: string;
  title: string;
  oneLiner: string;
  description: string;
  problemStatement: string;
  targetCustomer: string;
  revenueModel: string;
  mvpApproach: string;
  goToMarket: string;
  competitiveAdvantage: string;
  financialTrajectory: {
    month3: string;
    month6: string;
    month12: string;
    mrrCeiling: string;
  };
  requiredToolsSkills: string;
  risksMitigation: string;
  whyItFitsFounder: string;
  primaryPassionDomains: string[];
  primarySkillNeeds: string[];
  markets: string[];
  businessArchetype: string;
  hoursPerWeekMin: number;
  hoursPerWeekMax: number;
  capitalRequired: number;
  riskLevel: "low" | "medium" | "high";
  timeToFirstRevenueMonths: number;
  requiresPublicPersonalBrand: boolean;
  requiresTeamSoon: boolean;
  requiresCoding: boolean;
  salesIntensity: 1 | 2 | 3 | 4 | 5;
  asyncDepthWork: 1 | 2 | 3 | 4 | 5;
  firstSteps: string[];
}

PERSONALIZATION RULES
---------------------
When generating ideas:
- Always respect hoursPerWeek, availableCapital, runway, and riskTolerance.
- Use skillSpikes to bias toward unfair advantages.
- Use primaryDesires, identity, and energyGivers to make ideas feel emotionally right.
- Use hellNoFilters, energyDrainers, and redFlags to AVOID superficially attractive but bad-fit ideas.
- Use marketSegmentsUnderstood, existingNetworkChannels, and inferredMarketSegments to bias toward markets they actually know.
- Use founderRoles, workStylePreferences, and inferredArchetypes to pick fitting businessArchetype and execution style.

TONE AND STYLE OF IDEAS
-----------------------
- Concrete, non-generic, rooted in real buyer personas and workflows.
- No vague "build a platform for everyone" ideas.
- Each idea should feel like: "Oh, THAT is exactly the kind of thing I could build and sell."
- Avoid clichés and “hustle bro” language.

RESPONSE FORMAT (CRITICAL)
--------------------------
- You MUST return ONLY valid JSON.
- The top-level value MUST be an array of 9–12 BusinessIdea objects.
- Do NOT wrap JSON in markdown fences.
- Do NOT include any commentary, prose, or explanation outside JSON.
- Do NOT expose chain-of-thought or internal reasoning.
- If you need to reason, do it silently and only output the final JSON.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      console.error("generate-founder-ideas: auth error", userError);
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Load founder profile (normalized JSON)
    const { data: profileRow, error: profileError } = await supabase
      .from("founder_profiles")
      .select("profile")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profileRow?.profile) {
      console.error("generate-founder-ideas: founder profile not found", profileError);
      return new Response(
        JSON.stringify({ error: "Founder profile not found. Please complete onboarding first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load latest completed interview context summary (optional)
    const { data: interviewRows, error: interviewError } = await supabase
      .from("founder_interviews")
      .select("context_summary, updated_at, status")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (interviewError) {
      console.error("generate-founder-ideas: interview fetch error (non-fatal)", interviewError);
    }

    const contextSummary = interviewRows?.[0]?.context_summary ?? null;

    const payload = {
      founderProfile: profileRow.profile,
      contextSummary,
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("generate-founder-ideas: LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("generate-founder-ideas: AI gateway error", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content as string | undefined;

    if (!rawContent) {
      console.error("generate-founder-ideas: missing content in AI response", JSON.stringify(aiData));
      return new Response(
        JSON.stringify({ error: "Invalid AI response format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let ideas: unknown;

    try {
      // Try direct parse
      ideas = JSON.parse(rawContent);
    } catch (e) {
      console.warn("generate-founder-ideas: direct JSON parse failed, attempting bracket extraction", e);
      const firstBracket = rawContent.indexOf("[");
      const lastBracket = rawContent.lastIndexOf("]");
      if (firstBracket === -1 || lastBracket === -1) {
        console.error("generate-founder-ideas: no JSON array found in AI content", rawContent);
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const sliced = rawContent.slice(firstBracket, lastBracket + 1);
      ideas = JSON.parse(sliced);
    }

    if (!Array.isArray(ideas)) {
      console.error("generate-founder-ideas: parsed ideas is not an array", ideas);
      return new Response(
        JSON.stringify({ error: "AI did not return an array of ideas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ideas }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("generate-founder-ideas: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
