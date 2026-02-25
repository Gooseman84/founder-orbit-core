import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[generate-revenue-stack-brief] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

  try {
    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // === JWT Authentication ===
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    log("Authenticated", { userId });

    const { venture_id } = await req.json();
    if (!venture_id) {
      return new Response(
        JSON.stringify({ error: "venture_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // === Fetch all context in parallel ===
    const [ventureRes, interviewRes, northStarRes, fvsRes] = await Promise.all([
      admin
        .from("ventures")
        .select("name, status, venture_state, success_metric")
        .eq("id", venture_id)
        .eq("user_id", userId)
        .single(),
      admin
        .from("founder_interviews")
        .select("context_summary")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("workspace_documents")
        .select("content")
        .eq("venture_id", venture_id)
        .eq("user_id", userId)
        .eq("doc_type", "north_star_spec")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("financial_viability_scores")
        .select("dimensions, composite_score, summary")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const venture = ventureRes.data;
    if (!venture) throw new Error("Venture not found");

    const interview = interviewRes.data as any;
    const northStar = northStarRes.data as any;
    const fvs = fvsRes.data as any;

    log("Context fetched", {
      hasInterview: !!interview?.context_summary,
      hasNorthStar: !!northStar?.content,
      hasFVS: !!fvs,
    });

    // === Build user prompt ===
    const ctx = interview?.context_summary ?? {};
    const ventureIntel = ctx.ventureIntelligence ?? {};
    const founderIntel = ctx.founderIntelligence ?? {};

    const northStarExcerpt = northStar?.content
      ? northStar.content.slice(0, 2000)
      : "No North Star Spec available yet.";

    const userPrompt = `VENTURE: ${venture.name}
SUCCESS METRIC: ${venture.success_metric || "Not defined"}

BUSINESS MODEL (from Mavrik interview):
${ventureIntel.businessModel || "Not specified"}

FOUNDER CONSTRAINTS & SKILLS:
${founderIntel.insiderKnowledge || "No insider knowledge captured"}
Capital available: ${founderIntel.capitalAvailable ?? "Unknown"}
Time available: ${founderIntel.hoursPerWeek ?? "Unknown"} hours/week
Risk tolerance: ${founderIntel.riskTolerance ?? "Unknown"}

FVS SUMMARY:
Composite score: ${fvs?.composite_score ?? "N/A"}
${fvs?.summary || "No FVS summary available"}

NORTH STAR SPEC (excerpt):
${northStarExcerpt}

Generate the Revenue Stack Brief for this venture.`;

    const systemPrompt = `You are Mavrik, a financially grounded startup advisor with CFA and CFP credentials. You analyze business ventures through a revenue architecture lens — identifying not just the obvious monetization path but the full stack of revenue opportunities available to a founder based on their specific venture, skills, and market.

You evaluate ventures across six revenue layers:

LAYER 1 — Core Recurring Engine
The primary revenue stream. Subscription, usage-based, transaction-based, or hybrid. This is where the business starts.

LAYER 2 — Expansion Layer
Modular add-ons, upsells, premium tiers, or feature unlocks that increase revenue per customer over time.

LAYER 3 — Financial Infrastructure Layer
Does this business touch or enable money movement? Payments, lending, insurance, embedded finance. This is where outsized outcomes often hide.

LAYER 4 — Data Monetization Layer
Can anonymized usage data be benchmarked, licensed, or used to create network effects? Requires scale but creates defensible moats.

LAYER 5 — Ecosystem Layer
Marketplace, certification, revenue share, professional network. Network businesses beat tools at scale.

LAYER 6 — Authority and Education Layer
Certification, training, industry standard positioning. Builds brand gravity and creates high-margin revenue.

Your job is to:
1. Evaluate which layers genuinely apply to this specific venture
2. Identify the primary layer the founder should focus on first
3. Surface 1-2 non-obvious revenue layers they may not have considered
4. Flag any layers that appear attractive but are actually traps for this specific business model or founder profile
5. Give a concrete recommendation on revenue sequencing — what to monetize first, second, and third as the business grows

Be specific to this venture. Do not give generic advice. Reference the founder's actual constraints, skills, and market from the interview data.

Never recommend a revenue layer that would require resources or capabilities the founder clearly does not have at this stage.

Format your response as a well-structured markdown document with these exact sections:

# Revenue Stack Brief: [Venture Name]

## Your Primary Revenue Engine
[Which layer, why it fits, what the initial monetization model should be]

## Expansion Opportunities
[1-3 realistic expansion plays with brief rationale for each]

## The Non-Obvious Play
[1 revenue layer the founder likely hasn't considered, with specific reasoning for why it applies to their venture]

## What to Avoid (And Why)
[1-2 revenue layers that look attractive but are wrong for this venture at this stage — be specific about the trap]

## Revenue Sequencing Recommendation
[Concrete sequence: what to charge for first, what to add at 6 months, what to build toward at 18 months]

## One Financial Reality Check
[A single honest observation about the revenue model's viability — something a CFA-credentialed advisor would say that a generic AI tool would not]`;

    log("Calling AI Gateway");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      log("AI Gateway error", { status, error: errorText });
      throw new Error(`AI Gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    log("AI response received", { contentLength: content.length });

    // === Insert workspace document ===
    const { data: doc, error: docError } = await admin
      .from("workspace_documents")
      .insert({
        venture_id,
        user_id: userId,
        doc_type: "revenue_stack_brief",
        title: "Revenue Stack Brief",
        content,
        status: "draft",
      })
      .select("id")
      .single();

    if (docError) {
      log("Document insert error", { error: docError });
      throw new Error("Failed to save Revenue Stack Brief");
    }

    log("Document saved", { documentId: doc.id });

    return new Response(
      JSON.stringify({ document_id: doc.id, content }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
