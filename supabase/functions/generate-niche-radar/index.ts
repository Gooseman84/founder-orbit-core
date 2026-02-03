import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function buildRadarInput(supabaseClient: any, userId: string) {
  try {
    const { data: profile, error: profileError } = await supabaseClient
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) return null;

    const { data: idea, error: ideaError } = await supabaseClient
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) throw ideaError;
    if (!idea) return null;

    const { data: analysis, error: analysisError } = await supabaseClient
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) return null;

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
    };
  } catch (error) {
    console.error("Error building radar input:", error);
    return null;
  }
}

// Extended signal types for v6
const VALID_SIGNAL_TYPES = [
  "trend", 
  "problem", 
  "market_shift", 
  "consumer_behavior", 
  "tech_tailwind",
  // V6 signal types
  "platform_trend",
  "meme_format",
  "creator_monetization_shift",
  "automation_tailwind"
];

const RISK_LEVELS = ["low", "medium", "high"];

function formatRadarSignals(rawSignals: any[]) {
  if (!Array.isArray(rawSignals)) return [];

  return rawSignals
    .filter((signal) => {
      if (!signal.signal_type || !signal.title || !signal.description || !signal.recommended_action) {
        return false;
      }
      return VALID_SIGNAL_TYPES.includes(signal.signal_type);
    })
    .map((signal) => ({
      signal_type: signal.signal_type,
      title: signal.title.trim(),
      description: signal.description.trim(),
      priority_score: Math.round(Number(signal.priority_score ?? 50)),
      recommended_action: signal.recommended_action.trim(),
      metadata: {
        ...(signal.metadata ?? {}),
        why_now: signal.why_now || null,
        relevance_to_idea: signal.relevance_to_idea || null,
        risk_level: RISK_LEVELS.includes(signal.risk_level) ? signal.risk_level : "medium",
        v6_triggers: signal.v6_triggers || null,
      },
    }));
}

const SYSTEM_PROMPT = `You are TrueBlazer.AI — an elite market researcher, category theorist, and opportunity scout.

Your job is to identify EMERGING NICHES and MARKET SIGNALS that REACT to v6 metrics for this specific founder.

## INTERNAL CHAIN-OF-THOUGHT (do this before generating signals)

Before outputting signals, think through these steps:

1. **V6 METRIC SCAN**: Which metrics are high (≥60)? What signal types do they trigger?
2. **PLATFORM CONTEXT**: Is a platform specified? What's happening on that platform NOW?
3. **FOUNDER FIT**: What are their skills, passions, risk tolerance? What signals match them?
4. **TIMING WINDOW**: Why would each opportunity be relevant in the next 30-90 days?
5. **IDEA ALIGNMENT**: How does each signal specifically connect to THIS idea (not generic advice)?
6. **RISK CALIBRATION**: Given founder's risk tolerance, which opportunities are appropriate?

## V6 METRIC TRIGGERS (Generate specific signal types based on these)

**culture_tailwind (0-100):**
- ≥70: Prioritize cultural momentum waves, zeitgeist shifts, trending topics
- ≥50: Include cultural relevance signals

**virality_potential (0-100):**
- ≥60: Identify trends that reward shareable content, hook patterns
- Include platform-specific viral mechanics

**chaos_factor (0-100):**
- ≥50: Show unstable markets ripe for disruption, contrarian plays
- Include first-mover opportunities in chaotic spaces

**leverage_score (0-100):**
- ≥65: Show scalable channels, leverage plays, multiplication opportunities
- Include delegation and systems-building signals

**automation_density (0-100):**
- ≥60: Include automation_tailwind signals
- Highlight AI/automation tools enabling new plays

**platform (when specified):**
- Prioritize platform_trend signals for that specific platform
- Include algorithm changes, feature updates, monetization shifts

**mode triggers:**
- memetic: Include meme_format signals, viral templates
- creator/content: Include creator_monetization_shift signals
- automation/system: Include automation_tailwind signals
- chaos/locker_room: Include edgy but ethical cultural signals

## SIGNAL TYPES

- "trend": Macro trends in the industry or market (validated by data)
- "problem": Emerging pain points or unmet needs (with evidence)
- "market_shift": Changes in market dynamics or buyer behavior
- "consumer_behavior": Shifts in how people buy, consume, or interact
- "tech_tailwind": New technologies enabling new opportunities
- "platform_trend": Platform-specific changes (algorithm, features, monetization)
- "meme_format": Emerging meme formats, viral templates, cultural moments
- "creator_monetization_shift": New ways creators are making money
- "automation_tailwind": AI/automation tools making previously hard things easy

## FEW-SHOT EXAMPLES

### EXAMPLE 1: SaaS Founder, High Automation Density + High Leverage

**V6 Metrics**: automation_density: 85, leverage_score: 78, platform: null, mode: "system"
**Idea**: "AI-powered email warm-up service for sales teams"

**Thinking**:
1. V6 SCAN: automation_density (85) triggers automation_tailwind. leverage_score (78) triggers scalable channels.
2. PLATFORM: No specific platform, B2B SaaS context.
3. FOUNDER FIT: Technical skills, building automation tools, moderate risk tolerance.
4. TIMING: AI tools are commoditizing, warm-up space is heating up.
5. ALIGNMENT: Email deliverability → integrate with broader sales stack plays.
6. RISK: Medium risk appropriate for moderate tolerance.

**Output Signals**:
{
  "signals": [
    {
      "signal_type": "automation_tailwind",
      "title": "AI Email Personalization APIs Becoming Commoditized",
      "description": "Major providers (Anthropic, OpenAI) now offer sub-second text generation. Previously expensive personalization is now $0.001/email. This enables hyper-personalization at scale that was cost-prohibitive 6 months ago.",
      "priority_score": 88,
      "recommended_action": "Add AI-personalized subject lines and preview text as a premium tier feature. Test with 10 beta users this week.",
      "why_now": "API costs dropped 80% in Q4 2024. Competitors haven't caught up yet. 3-month window to establish this as a differentiator.",
      "relevance_to_idea": "Your warm-up service already handles volume email. Adding personalization makes each warmed-up inbox more valuable to sales teams.",
      "risk_level": "low",
      "v6_triggers": ["automation_density", "leverage_score"]
    },
    {
      "signal_type": "problem",
      "title": "Microsoft 365 Tightening Spam Filters in January",
      "description": "Microsoft announced stricter spam filtering for M365 starting January 2025. B2B sales teams are panicking about deliverability. Google followed with similar announcements.",
      "priority_score": 92,
      "recommended_action": "Create urgency messaging around the January deadline. Offer 'M365 Compliance Audit' as a lead magnet this month.",
      "why_now": "The deadline is January. Decision-makers are actively searching for solutions NOW. Search volume for 'email warm-up' up 340% in December.",
      "relevance_to_idea": "Direct tailwind for your core service. More pain = more demand. Position as the M365-first warm-up solution.",
      "risk_level": "low",
      "v6_triggers": ["automation_density"]
    },
    {
      "signal_type": "market_shift",
      "title": "Sales Teams Consolidating Around Fewer Tools",
      "description": "Economic pressure is forcing sales teams to consolidate their tech stack. They want fewer vendors, more integrated solutions. Standalone point solutions are losing to platforms.",
      "priority_score": 75,
      "recommended_action": "Build native integrations with the top 3 sales engagement platforms (Outreach, Salesloft, Apollo). Explore partnership/acquisition conversations.",
      "why_now": "Q1 budget planning is happening now. Teams are deciding which tools to keep vs. cut. Integration = survival.",
      "relevance_to_idea": "Your standalone warm-up service is vulnerable to platform bundling. Integrate now or risk becoming a feature, not a product.",
      "risk_level": "medium",
      "v6_triggers": ["leverage_score"]
    }
  ]
}

### EXAMPLE 2: Creator, High Virality + High Culture Tailwind + Platform Specified

**V6 Metrics**: virality_potential: 82, culture_tailwind: 75, platform: "TikTok", mode: "creator"
**Idea**: "Fitness coaching for busy professionals via short-form content"

**Thinking**:
1. V6 SCAN: virality_potential (82) and culture_tailwind (75) → focus on viral mechanics and cultural moments.
2. PLATFORM: TikTok specified → platform_trend signals essential.
3. FOUNDER FIT: Creator mode, comfortable on camera, fitness expertise.
4. TIMING: January fitness surge, TikTok algorithm changes.
5. ALIGNMENT: Busy professionals + short-form = desk exercises, meeting breaks.
6. RISK: Low risk signals appropriate for creator business.

**Output Signals**:
{
  "signals": [
    {
      "signal_type": "platform_trend",
      "title": "TikTok Prioritizing 2-3 Minute Videos Over Shorts",
      "description": "TikTok is actively boosting videos in the 2-3 minute range over sub-60 second clips. Creators reporting 3-5x more reach on slightly longer, high-retention content.",
      "priority_score": 90,
      "recommended_action": "Restructure your workout clips as '2-minute desk workouts' instead of 30-second snippets. Hook in first 3 seconds, deliver full value, end with clear CTA.",
      "why_now": "Algorithm change rolled out in November. Early adopters are seeing massive gains. Window is 60-90 days before saturation.",
      "relevance_to_idea": "Your 'busy professional' angle works perfectly with 2-minute format. They have 2 minutes, not 30. Match the algorithm AND the audience.",
      "risk_level": "low",
      "v6_triggers": ["virality_potential", "platform_trend"]
    },
    {
      "signal_type": "meme_format",
      "title": "'Corporate Girlies' Aesthetic Dominating Fitness Content",
      "description": "The 'corporate girlie' aesthetic (office wear, coffee cups, laptop lifestyle) is crossing into fitness content. Videos showing workouts in blazers or 'executive wellness' are getting 10x engagement.",
      "priority_score": 85,
      "recommended_action": "Film 3-5 videos this week in business casual. 'CEO morning stretch', 'Partner track posture fix', 'Goldman grind recovery'. Lean into the aesthetic hard.",
      "why_now": "Trend peaked in November, still has 4-6 weeks of runway. January 'new year new me' will amplify it further.",
      "relevance_to_idea": "Your target audience IS the corporate girlie. They want to see themselves in your content. This is identity-match marketing.",
      "risk_level": "low",
      "v6_triggers": ["culture_tailwind", "meme_format"]
    },
    {
      "signal_type": "creator_monetization_shift",
      "title": "TikTok Shop Affiliate Commissions Spiking for Fitness",
      "description": "TikTok Shop commissions for fitness equipment and supplements are 15-25%, up from 5-10% last quarter. The platform is aggressively pushing fitness commerce.",
      "priority_score": 78,
      "recommended_action": "Curate a 'desk workout essentials' collection on TikTok Shop. Resistance bands, mini steppers, posture correctors. Feature one item per video naturally.",
      "why_now": "TikTok is burning money on affiliate subsidies to compete with Amazon. This commission rate won't last. Capture it in Q1 2025.",
      "relevance_to_idea": "Monetize your audience without requiring coaching sign-ups. Lower friction, faster revenue. Funds your content creation.",
      "risk_level": "low",
      "v6_triggers": ["virality_potential", "creator_monetization_shift"]
    }
  ]
}

### EXAMPLE 3: Memetic Mode, High Chaos Factor + Edgy Mode Enabled

**V6 Metrics**: chaos_factor: 72, shock_factor: 65, culture_tailwind: 80, mode: "memetic", edgy_mode: "on"
**Idea**: "Anonymous meme page monetized through merch and sponsorships"

**Thinking**:
1. V6 SCAN: chaos_factor (72) and shock_factor (65) → contrarian, edgy opportunities.
2. PLATFORM: Instagram/Twitter implied by meme page context.
3. FOUNDER FIT: High risk tolerance (edgy mode on), anonymous operation, cultural savvy.
4. TIMING: Election cycle ending, cultural attention shifting to new topics.
5. ALIGNMENT: Meme page = ride cultural moments, not create them.
6. RISK: Medium-high risk signals appropriate for edgy mode.

**Output Signals**:
{
  "signals": [
    {
      "signal_type": "meme_format",
      "title": "'NPC' and 'Main Character' Discourse Resurging",
      "description": "The NPC meme is evolving into sophisticated commentary on authenticity vs. performance. 'Are you an NPC or main character?' content is getting massive engagement across platforms.",
      "priority_score": 88,
      "recommended_action": "Create a series of 'NPC vs Main Character' comparison memes for your niche. The format is flexible enough to apply to any industry or community.",
      "why_now": "The format just hit mainstream Twitter. You have 2-3 weeks before it becomes oversaturated. Move fast.",
      "relevance_to_idea": "Meme pages thrive on format-jacking. This is a proven format you can adapt to your audience's context immediately.",
      "risk_level": "low",
      "v6_triggers": ["culture_tailwind", "meme_format"]
    },
    {
      "signal_type": "market_shift",
      "title": "Brands Desperate for Authentic Meme Partnerships",
      "description": "Brands are getting destroyed for 'cringe' corporate meme attempts. They're now paying premium for meme pages to create content FOR them rather than posting brand content.",
      "priority_score": 82,
      "recommended_action": "Reach out to 5 brands in your audience's world with a 'we'll make it for you' package. $2-5K per sponsored meme that looks organic.",
      "why_now": "Q1 marketing budgets just unlocked. Brands are actively seeking partners for 2025 content strategies. First-mover advantage on outreach.",
      "relevance_to_idea": "Your anonymous page IS the authentic voice brands can't replicate. That's the value prop. Charge for it.",
      "risk_level": "medium",
      "v6_triggers": ["chaos_factor", "culture_tailwind"]
    },
    {
      "signal_type": "consumer_behavior",
      "title": "Gen Z Backlash Against 'Clean' Aesthetic Starting",
      "description": "The minimalist, 'clean girl', aesthetic perfectionism is facing backlash. Intentionally messy, chaotic, and raw content is outperforming polished content among younger audiences.",
      "priority_score": 75,
      "recommended_action": "Lean into intentionally rough, unpolished meme formats. Screenshot aesthetics, bad crops, low-res images signal authenticity now.",
      "why_now": "This is early-stage backlash. The pendulum is swinging. Position your page as 'authentically chaotic' before everyone else pivots.",
      "relevance_to_idea": "Your anonymous page can be maximally chaotic. No brand guidelines, no polish requirements. This is your advantage.",
      "risk_level": "medium",
      "v6_triggers": ["chaos_factor", "shock_factor"]
    }
  ]
}

## RULES

1. **SPECIFICITY**: Every signal must include specific numbers, timeframes, or evidence. No vague "the market is growing."
2. **ACTION VERBS**: recommended_action must start with a verb: "Create", "Reach out", "Build", "Test", "Launch"
3. **WHY NOW**: Every signal needs a clear timing reason. If it's evergreen, it's not a signal.
4. **IDEA CONNECTION**: relevance_to_idea must reference specific elements of THIS founder's idea
5. **V6 TRIGGERS**: Every signal must list which v6 metrics triggered it
6. **RISK HONESTY**: Match risk_level to the founder's risk_tolerance. Don't show high-risk plays to low-risk founders.
7. **5-8 SIGNALS**: Generate exactly 5-8 signals. Prioritize quality over quantity.
8. **PLATFORM PRIORITY**: If a platform is specified, at least 2 signals must be platform_trend type
9. **MODE RESPECT**: If mode is "memetic", include meme_format. If "creator", include creator_monetization_shift.
10. **NO JARGON**: Plain English. If a non-founder wouldn't understand it, rewrite it.

Output via the generate_radar_signals function with properly structured signals array.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Extract token and verify user
    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error("generate-niche-radar: auth error", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("generate-niche-radar: authenticated user", userId);

    // 3. Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    );

    // Server-side subscription validation with scan limit for trial
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('plan, status')
      .eq('user_id', userId)
      .maybeSingle();

    const plan = subscription?.plan || "trial";
    const isPro = plan === 'pro' || plan === 'founder';
    const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    // For trial users, check scan count (limit 1)
    if (!isPro) {
      // Count existing radar signals grouped by time (each batch = 1 scan)
      const { data: existingSignals } = await supabaseAdmin
        .from('niche_radar')
        .select('created_at')
        .eq('user_id', userId);
      
      // Count unique scan batches
      const uniqueDates = new Set<string>();
      (existingSignals || []).forEach((signal) => {
        const date = new Date(signal.created_at);
        date.setSeconds(0, 0);
        uniqueDates.add(date.toISOString());
      });
      
      if (uniqueDates.size >= 1) {
        return new Response(
          JSON.stringify({ 
            error: 'RADAR_LIMIT_REACHED', 
            message: 'You\'ve used your trial radar scan. Upgrade to Pro for unlimited market research.' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const inputData = await buildRadarInput(supabaseAdmin, userId);
    if (!inputData) {
      return new Response(
        JSON.stringify({ error: "Could not build input" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract v6 metrics for explicit prompt injection
    const v6Metrics = {
      virality_potential: inputData.idea.virality_potential ?? 'N/A',
      leverage_score: inputData.idea.leverage_score ?? 'N/A',
      automation_density: inputData.idea.automation_density ?? 'N/A',
      autonomy_level: inputData.idea.autonomy_level ?? 'N/A',
      culture_tailwind: inputData.idea.culture_tailwind ?? 'N/A',
      chaos_factor: inputData.idea.chaos_factor ?? 'N/A',
      shock_factor: inputData.idea.shock_factor ?? 'N/A',
      mode: inputData.idea.mode ?? 'N/A',
      category: inputData.idea.category ?? 'N/A',
      platform: inputData.idea.platform ?? 'N/A',
    };

    // Build enriched input with v6 fields explicitly highlighted
    const userPrompt = `Analyze this founder's context and generate market signals.

## Founder Profile
${JSON.stringify({
  passions: inputData.founder_profile.passions_text || inputData.founder_profile.passions_tags?.join(', '),
  skills: inputData.founder_profile.skills_text || inputData.founder_profile.skills_tags?.join(', '),
  risk_tolerance: inputData.founder_profile.risk_tolerance,
  edgy_mode: inputData.founder_profile.edgy_mode ?? 'safe',
}, null, 2)}

## Current Idea
${JSON.stringify({
  title: inputData.idea.title,
  description: inputData.idea.description?.slice(0, 400),
  business_model_type: inputData.idea.business_model_type,
  target_customer: inputData.idea.target_customer,
}, null, 2)}

## ⚡ V6 METRICS (REACT TO THESE!) ⚡
${JSON.stringify(v6Metrics, null, 2)}

## Idea Analysis
${JSON.stringify({
  niche_score: inputData.analysis.niche_score,
  market_insight: inputData.analysis.market_insight?.slice(0, 300),
  competition_snapshot: inputData.analysis.competition_snapshot?.slice(0, 200),
  biggest_risks: inputData.analysis.biggest_risks,
}, null, 2)}

---

Generate 5-8 market signals that:
1. REACT to v6 metrics (platform trends if platform specified, meme formats if memetic mode, etc.)
2. Include why_now, relevance_to_idea, and risk_level for EVERY signal
3. Are specific and actionable
4. Connect directly to this founder's idea`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_radar_signals",
            description: "Generate market signals based on v6 metrics",
            parameters: {
              type: "object",
              properties: {
                signals: { 
                  type: "array", 
                  items: { 
                    type: "object",
                    properties: {
                      signal_type: { type: "string", enum: VALID_SIGNAL_TYPES },
                      title: { type: "string" },
                      description: { type: "string" },
                      priority_score: { type: "number" },
                      recommended_action: { type: "string" },
                      why_now: { type: "string", description: "Why is this opportunity emerging right now?" },
                      relevance_to_idea: { type: "string", description: "How does this connect to this founder's idea?" },
                      risk_level: { type: "string", enum: RISK_LEVELS },
                      v6_triggers: { type: "array", items: { type: "string" }, description: "Which v6 metrics triggered this signal" },
                      metadata: { type: "object" }
                    },
                    required: ["signal_type", "title", "description", "recommended_action", "why_now", "relevance_to_idea", "risk_level"]
                  } 
                }
              },
              required: ["signals"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_radar_signals" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("generate-niche-radar: AI error", aiResponse.status, errorText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }
    
    const parsed = JSON.parse(toolCall.function.arguments);
    const formattedSignals = formatRadarSignals(parsed.signals || []);

    console.log("generate-niche-radar: formatted", formattedSignals.length, "signals");

    // Delete old signals and insert new ones
    await supabaseAdmin.from("niche_radar").delete().eq("user_id", userId);
    
    const signalsToInsert = formattedSignals.map(s => ({
      user_id: userId,
      idea_id: inputData.idea.id,
      ...s,
    }));

    const { data, error } = await supabaseAdmin.from("niche_radar").insert(signalsToInsert).select();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("generate-niche-radar: error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
