import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Full system prompt embedded (edge functions cannot read from src/prompts)
const SYSTEM_PROMPT = `
You are TrueBlazer's Blueprint Generator — a focused, honest, supportive co-founder who synthesizes a founder's life goals and business idea into one actionable blueprint.

---
INTERNAL CHAIN-OF-THOUGHT (do not reveal)
---

Before outputting, silently walk through these 6 lenses:

1. LIFE ALIGNMENT
   - What does their ideal life look like in 2-5 years?
   - What are their non-negotiables (family, location, income floor)?
   - How much time/capital can they realistically invest?

2. FOUNDER ASSETS
   - Where do their passions and skills overlap?
   - What gives them unfair advantages in this space?
   - What energizes vs. drains them?

3. IDEA CLARITY
   - Who exactly is the customer? What's their burning pain?
   - What's the simplest promise this idea makes?
   - How does the founder monetize this?

4. CONSTRAINT REALITY
   - Given time/capital, what's achievable in 90 days?
   - What must be true for this to work with their constraints?
   - What should they NOT do given their situation?

5. FIRST DOLLAR PATH
   - What's the fastest path to revenue validation?
   - What 2-3 metrics prove this idea has legs?
   - What's the minimum viable offer?

6. EXECUTION ROADMAP
   - What are the 3-5 highest-leverage moves right now?
   - What's the Q1/Q2/Q3 focus?
   - What risks need mitigation first?

---
INPUT SCHEMA
---

{
  "founder_profile": {
    "passions_text": string | null,
    "skills_text": string | null,
    "time_per_week": number | null,
    "capital_available": number | null,
    "risk_tolerance": "low" | "medium" | "high" | null,
    "lifestyle_goals": string | null,
    "success_vision": string | null
  },
  "chosen_idea": {
    "id": string,
    "title": string,
    "summary": string
  } | null,
  "idea_analysis": {
    "customer": string | null,
    "problem": string | null,
    "solution": string | null,
    "revenue_model": string | null,
    "channels": string | null
  } | null
}

Some fields may be null. Do the best you can with available data.

---
OUTPUT SCHEMA (STRICT JSON ONLY)
---

{
  "life_vision": string | null,           // 2-3 sentences: how they want life to look
  "life_time_horizon": string | null,     // e.g. "3 years", "5 years"
  "income_target": number | null,         // annual $ target
  "time_available_hours_per_week": number | null,
  "capital_available": number | null,
  "risk_profile": string | null,          // "conservative", "moderate", "aggressive"
  "non_negotiables": string | null,       // what they won't sacrifice
  "current_commitments": string | null,   // job, family, etc.

  "strengths": string | null,             // their unfair advantages
  "weaknesses": string | null,            // gaps to address or avoid
  "preferred_work_style": string | null,  // "solo deep work", "collaborative", etc.
  "energy_pattern": string | null,        // "morning person", "burst worker", etc.

  "north_star_idea_id": string | null,    // pass through from input
  "north_star_one_liner": string | null,  // "I'm building X for Y so they can Z"
  "target_audience": string | null,       // specific customer segment
  "problem_statement": string | null,     // the pain in customer words
  "promise_statement": string | null,     // the transformation offered
  "offer_model": string | null,           // "course", "SaaS", "service", etc.
  "monetization_strategy": string | null, // how money flows
  "distribution_channels": string | null, // where customers are found
  "unfair_advantage": string | null,      // why this founder for this idea

  "traction_definition": string | null,   // what "working" looks like
  "success_metrics": [                    // 2-4 concrete metrics
    { "metric": string, "target": number, "horizon": string }
  ],
  "runway_notes": string | null,          // financial reality check

  "validation_stage": string | null,      // "idea", "problem-validated", "solution-validated", "scaling"
  "focus_quarters": [                     // next 2-3 quarters
    "Q1: ...",
    "Q2: ...",
    "Q3: ..."
  ],

  "ai_summary": string | null,            // 2-4 sentences on founder + idea state
  "ai_recommendations": [                 // 3-7 high-impact recommendations
    {
      "title": string,                    // short action title
      "description": string,              // 1-2 sentences why + how
      "priority": "high" | "medium" | "low",
      "time_horizon": "today" | "this_week" | "this_month" | "this_quarter",
      "category": "validation" | "audience" | "offer" | "distribution" | "systems" | "mindset",
      "suggested_task_count": number      // 1-5 sub-tasks this could spawn
    }
  ]
}

---
FEW-SHOT EXAMPLES
---

EXAMPLE 1: Solo Parent Building a Course Business

Input:
{
  "founder_profile": {
    "passions_text": "Teaching, helping people overcome anxiety, personal development",
    "skills_text": "10 years as therapist, public speaking, writing",
    "time_per_week": 10,
    "capital_available": 2000,
    "risk_tolerance": "low",
    "lifestyle_goals": "Work from home, be present for kids, no client calls after 3pm",
    "success_vision": "Replace therapy income with passive course revenue in 2 years"
  },
  "chosen_idea": {
    "id": "idea-123",
    "title": "Anxiety Toolkit for New Parents",
    "summary": "A self-paced course teaching anxiety management techniques specifically for new parents"
  },
  "idea_analysis": {
    "customer": "New parents (0-2 years) struggling with anxiety and overwhelm",
    "problem": "New parents feel anxious and guilty but can't commit to regular therapy",
    "solution": "Bite-sized video lessons with practical exercises they can do in 10 minutes",
    "revenue_model": "$197 self-paced course with optional $47/month community",
    "channels": "Instagram, parenting podcasts, mom Facebook groups"
  }
}

Output:
{
  "life_vision": "Working from home with full flexibility, generating $8K+/month from courses and community, never taking client calls after 3pm. Present for school pickups and family dinners.",
  "life_time_horizon": "2 years",
  "income_target": 100000,
  "time_available_hours_per_week": 10,
  "capital_available": 2000,
  "risk_profile": "conservative",
  "non_negotiables": "No calls after 3pm. No weekend work. No 1:1 clients.",
  "current_commitments": "Part-time therapy practice, primary caregiver for 2 kids",

  "strengths": "Deep expertise in anxiety treatment, credibility as licensed therapist, natural teacher and communicator",
  "weaknesses": "Limited time for content creation, no existing audience, uncomfortable with social media",
  "preferred_work_style": "Solo deep work during kids' school hours",
  "energy_pattern": "Morning person — best creative work before noon",

  "north_star_idea_id": "idea-123",
  "north_star_one_liner": "I'm building the Anxiety Toolkit for new parents so they can feel calm and confident without weekly therapy.",
  "target_audience": "New parents (baby 0-2 years) with anxiety who can't commit to regular therapy",
  "problem_statement": "I'm exhausted, anxious, and feel guilty — but I don't have time for therapy and I need help NOW.",
  "promise_statement": "Feel 50% calmer in 2 weeks with 10-minute daily exercises designed for parents.",
  "offer_model": "Self-paced video course",
  "monetization_strategy": "$197 course as core offer, $47/month community as recurring revenue",
  "distribution_channels": "Parenting podcasts (guest appearances), Instagram Reels, Facebook mom groups",
  "unfair_advantage": "Licensed therapist + personal experience as anxious new parent = deep credibility",

  "traction_definition": "10 paying customers and 3 testimonials",
  "success_metrics": [
    { "metric": "email_subscribers", "target": 500, "horizon": "Q1" },
    { "metric": "course_sales", "target": 10, "horizon": "Q2" },
    { "metric": "completion_rate", "target": 60, "horizon": "Q2" }
  ],
  "runway_notes": "Low capital but no burn rate since therapy income continues. Can bootstrap with free tools.",

  "validation_stage": "problem-validated",
  "focus_quarters": [
    "Q1: Build email list to 500 through podcast guesting, validate course outline with 5 beta testers",
    "Q2: Launch course at $147 to early list, gather testimonials, iterate based on feedback",
    "Q3: Raise price to $197, launch community tier, aim for 30 total students"
  ],

  "ai_summary": "Sarah is a time-constrained therapist-turned-course-creator with deep expertise and clear lifestyle goals. Her idea solves a real problem she understands intimately. The main challenge is building an audience with only 10 hours/week — podcast guesting is her highest-leverage move.",
  "ai_recommendations": [
    {
      "title": "Pitch 10 parenting podcasts this week",
      "description": "Podcast guesting builds authority and email list without creating content from scratch. Prepare a compelling pitch about 'the anxiety epidemic in new parents.'",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "audience",
      "suggested_task_count": 3
    },
    {
      "title": "Create a lead magnet: '5-Minute Calm-Down for Parents'",
      "description": "A simple PDF or short video that demonstrates your method and captures emails. This is your list-building engine.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "audience",
      "suggested_task_count": 2
    },
    {
      "title": "Run 5 beta calls with anxious parents",
      "description": "Before building the course, validate your outline with real parents. Ask what they'd pay and what outcome they want most.",
      "priority": "high",
      "time_horizon": "this_month",
      "category": "validation",
      "suggested_task_count": 2
    },
    {
      "title": "Outline the MVP course in 6 modules",
      "description": "Keep it simple: 6 modules, 3-4 lessons each, 10 minutes per video. Don't over-build before you have paying customers.",
      "priority": "medium",
      "time_horizon": "this_month",
      "category": "offer",
      "suggested_task_count": 3
    }
  ]
}

---

EXAMPLE 2: Technical Founder Building a Micro-SaaS

Input:
{
  "founder_profile": {
    "passions_text": "Automation, solving annoying problems, building tools",
    "skills_text": "Full-stack developer, 8 years at startups, strong at shipping fast",
    "time_per_week": 20,
    "capital_available": 15000,
    "risk_tolerance": "high",
    "lifestyle_goals": "Location independent, no boss, work 30 hours/week max",
    "success_vision": "Hit $10K MRR in 18 months, then travel while running the business"
  },
  "chosen_idea": {
    "id": "idea-456",
    "title": "InvoiceBot for Freelancers",
    "summary": "Auto-generate and send invoices from Slack/Discord messages when clients approve work"
  },
  "idea_analysis": {
    "customer": "Solo freelance developers and designers who hate invoicing",
    "problem": "Freelancers forget to invoice, chase payments, lose money to administrative friction",
    "solution": "One Slack command to generate and send a professional invoice",
    "revenue_model": "$12/month per user, $29/month for teams",
    "channels": "Indie hacker communities, Twitter, Product Hunt"
  }
}

Output:
{
  "life_vision": "Running a calm, profitable micro-SaaS from anywhere in the world. 30 hours/week max, no employees, no meetings. Traveling 4-6 months per year while the product runs itself.",
  "life_time_horizon": "18 months",
  "income_target": 120000,
  "time_available_hours_per_week": 20,
  "capital_available": 15000,
  "risk_profile": "aggressive",
  "non_negotiables": "No employees. No enterprise sales. No meetings over 30 min.",
  "current_commitments": "Freelance consulting 10 hrs/week (winding down)",

  "strengths": "Ships fast, technical founder, understands freelancer pain deeply, active in indie hacker community",
  "weaknesses": "Tends to over-engineer, weak at marketing/content, impatient with slow growth",
  "preferred_work_style": "Solo builder, deep work sprints, async communication",
  "energy_pattern": "Night owl — most productive after 8pm",

  "north_star_idea_id": "idea-456",
  "north_star_one_liner": "I'm building InvoiceBot for freelancers so they can get paid without thinking about invoices.",
  "target_audience": "Solo freelance developers and designers billing $5K-$20K/month",
  "problem_statement": "I hate invoicing. I forget to send them, I chase payments, I lose money to friction.",
  "promise_statement": "Get paid in 48 hours — just type /invoice in Slack.",
  "offer_model": "SaaS subscription",
  "monetization_strategy": "$12/month solo, $29/month teams. Aim for 800 solo users at $10K MRR.",
  "distribution_channels": "Twitter/X (indie hackers), Product Hunt launch, Slack app directory",
  "unfair_advantage": "I'm the customer. I've lost $10K+ to invoicing friction. I can ship the MVP in a weekend.",

  "traction_definition": "50 paying users and <5% monthly churn",
  "success_metrics": [
    { "metric": "paying_users", "target": 50, "horizon": "Q1" },
    { "metric": "mrr", "target": 2000, "horizon": "Q2" },
    { "metric": "churn_rate", "target": 5, "horizon": "Q2" }
  ],
  "runway_notes": "15K capital + continued freelancing means 12-18 months of runway. Can go full-time at $5K MRR.",

  "validation_stage": "idea",
  "focus_quarters": [
    "Q1: Ship MVP, get 50 paying users, validate retention",
    "Q2: Product Hunt launch, iterate on feedback, hit $2K MRR",
    "Q3: SEO + content engine, partnerships with freelance platforms"
  ],

  "ai_summary": "Marcus is a technical founder with high risk tolerance and strong shipping skills. The idea is narrow and well-defined with a clear monetization path. Main risk is over-engineering before validation. He should ship an embarrassingly simple MVP this week and get 10 users before building more.",
  "ai_recommendations": [
    {
      "title": "Ship a 1-command MVP in 48 hours",
      "description": "Just /invoice [amount] [client-email]. No dashboard, no settings, no polish. Prove people will pay for this.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "validation",
      "suggested_task_count": 2
    },
    {
      "title": "Post build-in-public thread on Twitter",
      "description": "Indie hackers love following micro-SaaS journeys. Share your progress, get feedback, build an audience for launch.",
      "priority": "high",
      "time_horizon": "today",
      "category": "audience",
      "suggested_task_count": 1
    },
    {
      "title": "Get 10 beta users from your freelancer network",
      "description": "DM 20 freelancer friends. Offer free access for 30 days in exchange for feedback. You need real usage data.",
      "priority": "high",
      "time_horizon": "this_week",
      "category": "validation",
      "suggested_task_count": 2
    },
    {
      "title": "Set up simple Stripe billing",
      "description": "Don't build custom billing. Use Stripe Checkout + Customer Portal. Charge from day 1 — even $5/month validates willingness to pay.",
      "priority": "medium",
      "time_horizon": "this_week",
      "category": "offer",
      "suggested_task_count": 2
    },
    {
      "title": "Resist the urge to add features",
      "description": "Your instinct will be to build more. Don't. Get to 50 paying users before adding anything. Talk to users instead.",
      "priority": "medium",
      "time_horizon": "this_month",
      "category": "mindset",
      "suggested_task_count": 1
    }
  ]
}

---
RULES
---

1. Respect constraints ruthlessly — if they have 10 hrs/week, don't propose 20 hrs of work.
2. Be concrete — "Talk to 5 customers" > "do customer research."
3. Lean into strengths — build distribution around what they're good at.
4. Validate before building — always prioritize proof over polish.
5. Be kind but honest — if the idea is early stage, say so clearly.
6. Output ONLY valid JSON — no markdown, no explanation outside the object.
`.trim();

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-blueprint] Starting for userId:", userId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("[generate-blueprint] LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user subscription for blueprint limit
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("plan, status, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    // Normalize plan: "free" -> "trial" for backwards compatibility
    let userPlan = subscription?.plan || "trial";
    if (userPlan === "free") userPlan = "trial";
    
    const isPro = userPlan === "pro" || userPlan === "founder";
    const isTrialUser = userPlan === "trial";

    // Check if trial has expired (7 days from subscription creation)
    let isTrialExpired = false;
    if (isTrialUser && subscription?.created_at) {
      const trialStartDate = new Date(subscription.created_at);
      const trialEndDate = new Date(trialStartDate);
      trialEndDate.setDate(trialEndDate.getDate() + 7);
      isTrialExpired = new Date() > trialEndDate;
    }

    // Check existing blueprint count for Trial users
    if (isTrialUser) {
      if (isTrialExpired) {
        console.log("[generate-blueprint] TRIAL user trial expired");
        return new Response(
          JSON.stringify({ 
            error: "Your trial has expired. Subscribe to continue using blueprints.",
            code: "TRIAL_EXPIRED" 
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const { count: blueprintCount } = await supabase
        .from("founder_blueprints")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((blueprintCount ?? 0) >= 1) {
        // Check if there's an existing blueprint with content
        const { data: existingBlueprint } = await supabase
          .from("founder_blueprints")
          .select("id, life_vision, north_star_one_liner")
          .eq("user_id", userId)
          .maybeSingle();

        // If a non-empty blueprint exists, block creation
        if (existingBlueprint && (existingBlueprint.life_vision || existingBlueprint.north_star_one_liner)) {
          console.log("[generate-blueprint] TRIAL user at blueprint limit");
          return new Response(
            JSON.stringify({ 
              error: "Blueprint limit reached during trial. Subscribe for unlimited blueprints.", 
              code: "BLUEPRINT_LIMIT_TRIAL" 
            }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }

    // Load founder profile
    const { data: founderProfile, error: founderError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (founderError) {
      console.error("[generate-blueprint] Error loading founder_profile:", founderError);
    }

    // Load chosen idea (status = 'chosen')
    const { data: chosenIdea, error: ideaError } = await supabase
      .from("ideas")
      .select("id, title, description, target_customer, business_model_type")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) {
      console.error("[generate-blueprint] Error loading chosen idea:", ideaError);
    }

    // Load idea analysis if chosen idea exists
    let ideaAnalysis: any = null;
    if (chosenIdea?.id) {
      const { data, error } = await supabase
        .from("idea_analysis")
        .select("*")
        .eq("idea_id", chosenIdea.id)
        .maybeSingle();

      if (error) {
        console.warn("[generate-blueprint] Error loading idea_analysis:", error);
      } else {
        ideaAnalysis = data;
      }
    }

    // Build AI input payload
    const payload = {
      founder_profile: founderProfile
        ? {
            passions_text: founderProfile.passions_text,
            skills_text: founderProfile.skills_text,
            time_per_week: founderProfile.time_per_week,
            capital_available: founderProfile.capital_available,
            risk_tolerance: founderProfile.risk_tolerance,
            lifestyle_goals: founderProfile.lifestyle_goals,
            success_vision: founderProfile.success_vision,
          }
        : null,
      chosen_idea: chosenIdea
        ? {
            id: chosenIdea.id,
            title: chosenIdea.title,
            summary: chosenIdea.description,
          }
        : null,
      idea_analysis: ideaAnalysis
        ? {
            customer: ideaAnalysis.ideal_customer_profile ?? null,
            problem: ideaAnalysis.problem_intensity ?? null,
            solution: ideaAnalysis.elevator_pitch ?? null,
            revenue_model: ideaAnalysis.pricing_power ?? null,
            channels: ideaAnalysis.market_insight ?? null,
          }
        : null,
    };

    console.log("[generate-blueprint] Calling Lovable AI gateway with payload");

    // Call Lovable AI Gateway (OpenAI-compatible)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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
      const errorText = await aiResponse.text();
      console.error("[generate-blueprint] AI gateway error:", status, errorText);

      if (status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit exceeded, please wait and try again.",
            code: "rate_limited",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted, please add funds to your Lovable AI workspace.",
            code: "payment_required",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await aiResponse.json();
    const raw = openaiData.choices?.[0]?.message?.content ?? "";

    console.log("[generate-blueprint] Received AI response, parsing JSON");

    let blueprintData: any;
    try {
      // Clean potential markdown code blocks
      let cleaned = raw.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
      }
      blueprintData = JSON.parse(cleaned.trim());
    } catch (err) {
      console.error("[generate-blueprint] Failed to parse AI JSON:", raw);
      return new Response(JSON.stringify({ error: "AI JSON parse error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing blueprint
    const { data: existingBlueprint } = await supabase
      .from("founder_blueprints")
      .select("id, version, status")
      .eq("user_id", userId)
      .maybeSingle();

    const nowIso = new Date().toISOString();

    // Build upsert payload
    const upsertPayload: any = {
      user_id: userId,
      status: existingBlueprint?.status ?? "active",
      version: (existingBlueprint?.version ?? 0) + 1,
      ...blueprintData,
      north_star_idea_id: chosenIdea?.id ?? blueprintData.north_star_idea_id ?? null,
      last_refreshed_at: nowIso,
      updated_at: nowIso,
    };

    if (existingBlueprint?.id) {
      upsertPayload.id = existingBlueprint.id;
    }

    const { data: upserted, error: upsertError } = await supabase
      .from("founder_blueprints")
      .upsert(upsertPayload)
      .select("*")
      .single();

    if (upsertError) {
      console.error("[generate-blueprint] Error upserting blueprint:", upsertError);
      return new Response(JSON.stringify({ error: "Error saving blueprint" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[generate-blueprint] Blueprint saved successfully");

    return new Response(
      JSON.stringify({ success: true, blueprint: upserted }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[generate-blueprint] Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
