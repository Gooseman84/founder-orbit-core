import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TaskContext = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  estimated_minutes: number | null;
  xp_reward: number | null;
} | null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ===== CANONICAL AUTH BLOCK =====
    const authHeader = req.headers.get('Authorization') ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.slice(7).trim();
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('generate-workspace-suggestion: auth error', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_SESSION_MISSING' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log("Generating workspace suggestion for user:", userId);

    const { documentId, taskContext, previousSuggestion, refinementType } = await req.json() as {
      documentId: string;
      taskContext?: TaskContext;
      previousSuggestion?: string;
      refinementType?: 'shorter' | 'detailed' | 'different' | 'actionable';
    };

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Generating workspace suggestion for document:", documentId);

    // Use service role client for DB operations (after auth verified)
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1) Fetch the document content with ownership check
    const { data: doc, error: docError } = await supabase
      .from("workspace_documents")
      .select("id, title, content, doc_type, user_id")
      .eq("id", documentId)
      .maybeSingle();

    if (docError) {
      console.error("Error fetching document:", docError);
      throw docError;
    }

    if (!doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // CRITICAL: Verify ownership before proceeding
    if (doc.user_id !== userId) {
      console.error("Unauthorized access attempt to document:", documentId, "by user:", userId);
      return new Response(
        JSON.stringify({ error: "Unauthorized access to document" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentContent: string = doc.content || "";

    // Fetch Mavrik interview for personalized suggestions
    const { data: interviewData } = await supabase
      .from("founder_interviews")
      .select("context_summary")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const interviewContext = interviewData?.context_summary as any || null;

    // Fetch active venture for context
    const { data: ventureData } = await supabase
      .from("ventures")
      .select("name, idea_id")
      .eq("user_id", userId)
      .in("venture_state", ["executing", "committed"])
      .limit(1)
      .maybeSingle();

    // Fetch linked idea if venture exists
    let ideaContext: any = null;
    if (ventureData?.idea_id) {
      const { data: ideaData } = await supabase
        .from("ideas")
        .select("title, description, source_meta")
        .eq("id", ventureData.idea_id)
        .maybeSingle();
      ideaContext = ideaData;
    }

    // Build founder context for personalized suggestions
    let founderContextBlock = "";
    if (interviewContext || ideaContext) {
      const parts: string[] = [];
      
      if (interviewContext?.founderSummary)
        parts.push(`Founder: ${interviewContext.founderSummary}`);
      
      if (interviewContext?.ventureIntelligence?.verticalIdentified && 
          interviewContext.ventureIntelligence.verticalIdentified !== "none")
        parts.push(`Industry: ${interviewContext.ventureIntelligence.verticalIdentified}`);
      
      if (interviewContext?.extractedInsights?.insiderKnowledge?.length)
        parts.push(`Expertise: ${interviewContext.extractedInsights.insiderKnowledge.join(", ")}`);
      
      if (interviewContext?.extractedInsights?.customerIntimacy?.length)
        parts.push(`Customers: ${interviewContext.extractedInsights.customerIntimacy.join(", ")}`);
      
      if (ideaContext?.title)
        parts.push(`Venture: ${ideaContext.title}`);
      
      if (ideaContext?.description)
        parts.push(`Idea: ${ideaContext.description}`);
      
      if (ideaContext?.source_meta?.keyRisk)
        parts.push(`Key Risk: ${ideaContext.source_meta.keyRisk}`);
      
      if (interviewContext?.extractedInsights?.hardNoFilters?.length)
        parts.push(`Hard Nos: ${interviewContext.extractedInsights.hardNoFilters.join(", ")}`);
      
      founderContextBlock = `
FOUNDER CONTEXT (use this to personalize your suggestions):
${parts.join("\n")}
`;
    }

    const systemPrompt = `
You are an AI cofounder helping an ambitious founder complete one task at a time.
${founderContextBlock}
Your job:
- Look at the current task (if provided) and the current document content.
- Help the founder make tangible progress on THAT task, not generic advice.
- Suggest structure, drafts, and concrete next steps that can be directly pasted into the document.
- Use the FOUNDER CONTEXT above to make suggestions specific to their industry, expertise, and customers. Reference their insider knowledge and specific terminology when relevant.
- If they have hard-no filters, never suggest approaches that violate them.

Tone:
- Direct, practical, supportive.
- No fluffy self-help language.
- Write as if you're sitting next to them in a working session, pushing the work forward.
- Use industry-specific language they'd recognize from their domain.

Output:
- Return plain text only: a mix of short commentary plus concrete content, outlines, or drafts they can paste into the doc.
- Avoid JSON or markup.
`;

    const taskSection = taskContext
      ? `
Active task you are helping with (JSON):

${JSON.stringify(taskContext, null, 2)}
`
      : `
No explicit task was provided. Assume this document represents a focused piece of work (strategy, offer, script, or plan) and help move it forward in a practical way.
`;

    // Document-type–specific guidance
    let docTypeGuidance = "";

    switch (doc.doc_type) {
      case "offer":
        docTypeGuidance = `
You are helping refine an OFFER document.

Definition of Done:
- Clear, compelling promise/headline
- Clear target customer + pain + desired outcome
- Benefits structured as transformations, not features
- Optional pricing tiers
- Strong guarantee / risk reversal
- Optional FAQ or objections list

Your behavior:
- Push for clarity, specificity, and differentiation.
- Avoid fluff. Make the offer feel tangible and valuable.
- If the content is weak, propose a stronger version.
- If content is missing sections, propose the missing pieces.`;
        break;

      case "outline":
        docTypeGuidance = `
You are helping refine an OUTLINE document.

Definition of Done:
- Logical structure with clear sections
- Headings + subheadings that form a strong skeleton
- Each section has a purpose and expected content
- No long paragraphs; outlines should be crisp

Your behavior:
- Restructure content so it flows.
- Suggest missing sections.
- Turn rambly text into crisp bullets.
- Push for clarity and hierarchy.`;
        break;

      case "script":
        docTypeGuidance = `
You are helping refine a SCRIPT document.

Definition of Done:
- Strong hook opening
- Clear narrative arc or instructional flow
- Conversational, spoken-style writing
- Smooth transitions between sections
- Clear CTA or close

Your behavior:
- Punch up the hook.
- Maintain a friendly, confident voice.
- Provide actual lines they can use.
- Offer transitions or moments to emphasize.`;
        break;

      case "plan":
        docTypeGuidance = `
You are helping refine a PLAN document.

Definition of Done:
- Clear phases or milestones
- Specific actions and owners (if relevant)
- Timeline or priority order
- Risks, dependencies, and next immediate steps

Your behavior:
- Break chaos into ordered, digestible steps.
- Clarify sequencing.
- Recommend next 3–5 moves.
- Turn abstract ideas into shippable actions.`;
        break;

      case "brain_dump":
        docTypeGuidance = `
You are helping refine a BRAIN DUMP document.

Definition of Done:
- Take messy, unstructured text
- Identify themes, patterns, or priorities
- Highlight insights the founder isn't seeing
- Propose a next-step structure (outline or plan)

Your behavior:
- Extract signal from noise.
- Summarize the most important ideas.
- Suggest a structure they can convert into a real doc.`;
        break;

      case "customer_research":
        docTypeGuidance = `
You are helping the founder document CUSTOMER RESEARCH.

This is the most important document a founder creates during validation. Every insight here directly informs product decisions, positioning, and pricing.

Definition of Done:
- Each interview or conversation logged with: who, date, key quotes, and takeaways
- Patterns and themes identified across conversations
- Surprising findings highlighted (things that challenge assumptions)
- Clear "implications for the product" section
- A running list of the exact words customers use to describe their pain (use their language, not yours)

Structure to suggest if the doc is empty or unstructured:

## Interview Log

### [Name / Role / Date]
**Context:** [How you know them, their company, their role]
**Key quotes:** [Exact words they used — these become your copy]
**Pain points:** [What frustrates them most]
**Current solution:** [What they do today to solve this]
**Willingness to pay:** [Would they pay? How much? For what exactly?]
**Surprise insight:** [Anything unexpected]

## Patterns Emerging
- [Pattern 1 — seen in N conversations]
- [Pattern 2]

## Product Implications
- [What to build based on what you've heard]
- [What NOT to build — things you assumed mattered but don't]

## Customer Language Bank
- [Exact phrases customers use to describe the problem]
- [These become your landing page headlines and ad copy]

Your behavior:
- If the founder pastes raw notes, restructure them into the interview log format above.
- Highlight patterns they might not see across interviews.
- Push them to capture exact quotes — paraphrases lose the magic.
- If they have 3+ interviews, synthesize the patterns section.
- If they're writing interview questions, help them ask open-ended questions that reveal pain and behavior, not leading questions that confirm assumptions.
- Use the FOUNDER CONTEXT to connect insights to the specific venture.`;
        break;

      case "outreach":
        docTypeGuidance = `
You are helping the founder draft OUTREACH messages.

These are the actual messages they'll send to potential customers, beta testers, partners, community members, or anyone they need to reach.

Definition of Done:
- Clear, specific subject line or opening hook
- Personalized opening (not a mass blast)
- States the problem being solved in the recipient's language
- Clear, low-friction ask (not "buy my thing" — more like "would you try this and tell me what's missing?")
- No more than 5-6 sentences for cold outreach
- Warm outreach can be slightly longer but still concise
- Multiple variants for different contexts (LinkedIn DM, email, community post, Twitter/X reply)

Structure to suggest if the doc is empty:

## Cold Outreach Template
**Subject/Hook:** [One line that earns the open]
**Body:**
Hi [Name],
[One sentence about why you're reaching out to THEM specifically]
[One sentence about the problem you've seen in their industry]
[One sentence about what you built to solve it]
[The ask: "Would you try it for a week and tell me what's missing? Happy to give you free access."]
[Sign-off]

## Warm Outreach Template
[For people who already know you]

## Community Post Template
[For Reddit, forums, Slack groups — problem story format, not pitch]

## Follow-Up Template
[For people who didn't respond — sent 3-5 days after first message]

Your behavior:
- Keep messages SHORT. Every extra sentence reduces response rate.
- Kill any line that sounds like marketing copy. Real people don't talk like landing pages.
- The ask should always be low-friction: feedback, not purchase. Trial, not commitment.
- If the founder has hard-no filters (from FOUNDER CONTEXT), respect them. No cold calling language if they said no calls.
- Personalize using their customer intimacy.
- Suggest A/B variants: one direct, one story-based.
- For community posts, make sure the first 80% is genuine value / problem story and only the last 20% mentions the product.`;
        break;

      case "landing_page":
        docTypeGuidance = `
You are helping the founder write LANDING PAGE COPY.

This document is where they draft every section of their landing page. The AI should produce copy they can paste directly into their landing page builder.

Definition of Done:
- Hero section: headline, subhead, primary CTA
- Problem section: 2-3 sentences about the pain
- Solution section: what the product does (benefits, not features)
- Social proof section: placeholder for testimonials, credentials, or "built by" line
- How it works: 3-step process
- Pricing section: clear tiers or single plan
- FAQ: 4-6 common objections answered
- Final CTA: urgency-driven close

Structure to suggest if the doc is empty:

## Hero Section
**Headline:** [One clear sentence — the #1 benefit or problem solved]
**Subhead:** [One sentence expanding on how, for whom]
**CTA Button:** [Action verb + outcome, e.g., "Start saving 5 hours/week"]

## Problem
[2-3 sentences using the exact language your customers use — pull from your Customer Research doc if you have one]

## Solution
**What it does:**
- [Benefit 1 — transformation, not feature]
- [Benefit 2]
- [Benefit 3]

## Social Proof
- [Credential: "Built by a [your credential]"]
- [Testimonial placeholder: "What [Name] said after using it"]
- [Number: "Trusted by N users" or "N hours saved"]

## How It Works
1. [Step 1 — what the user does first]
2. [Step 2 — what happens next]
3. [Step 3 — the outcome they get]

## Pricing
[Free tier vs Pro tier, or single price with clear value anchor]

## FAQ
**Q: [Objection 1]**
A: [Direct, honest answer]
**Q: [Objection 2]**
A: [Direct answer]
[4-6 total FAQs targeting the top reasons people don't buy]

## Final CTA
**Headline:** [Urgency or aspiration — "Stop [pain]. Start [outcome]."]
**CTA Button:** [Same as hero CTA for consistency]

Your behavior:
- Use the FOUNDER CONTEXT to write copy that references the specific industry, customer type, and problem.
- Pull language from the Customer Research doc if one exists in the workspace.
- Headlines should be specific, not generic. "Save 5 hours/week on tax-loss harvesting" beats "Save time with AI."
- Benefits should be transformations: "Go from [before state] to [after state]" not "Our platform features X."
- Keep the full page under 800 words. Landing pages that convert are concise.
- If the founder has pricing in their Blueprint, use it.
- The FAQ section should address real objections, not softball questions.`;
        break;

      default:
        docTypeGuidance = `
No specific document type provided. 
Default Behavior:
- Improve clarity
- Propose stronger structure
- Move the task toward "done"
- Provide usable content blocks where possible.`;
    }

    // Task-category–specific guidance
    let categoryGuidance = "";

    const taskCategory = taskContext?.category?.toLowerCase?.() || null;

    if (!taskCategory) {
      categoryGuidance = `
No specific task category provided.
Default behavior:
- Focus on clarity and forward motion.
- Remove fluff.
- Propose the next concrete step for this piece of work.`;
    } else {
      switch (taskCategory) {
        case "offer":
        case "pricing":
        case "positioning":
          categoryGuidance = `
This task is about OFFER / POSITIONING.

Focus on:
- Clarifying the promise and who it's for.
- Making the value feel tangible and differentiated.
- Tightening any copy that describes the offer.
- Removing vague language and replacing it with specifics.

Your behavior:
- Suggest stronger positioning statements.
- Challenge weak promises or generic claims.
- Propose alternative angles if the current one feels flat.`;
          break;

        case "marketing":
        case "growth":
        case "top_of_funnel":
          categoryGuidance = `
This task is about MARKETING / GROWTH.

Focus on:
- Generating clear, actionable ways to get attention and interest.
- Turning vague ideas into specific campaigns or experiments.
- Emphasizing channels that fit the founder's constraints.

Your behavior:
- Propose concrete campaign ideas or hooks.
- Turn generic "post more" into specific content ideas.
- Include example headlines, hooks, or CTAs when helpful.`;
          break;

        case "content":
        case "social":
        case "email":
          categoryGuidance = `
This task is about CONTENT CREATION.

Focus on:
- Producing outlines, drafts, or polished pieces of content.
- Matching the tone to an ambitious but human founder.
- Making content clear, scannable, and engaging.

Your behavior:
- Give actual paragraphs, bullet lists, or scripts they can paste.
- When refining, show "before vs after" style improvements implicitly.
- Default to plain, conversational language over jargon.`;
          break;

        case "sales":
        case "conversion":
        case "closing":
          categoryGuidance = `
This task is about SALES / CONVERSION.

Focus on:
- Clarifying the buyer's pain and desired outcome.
- Strengthening the pitch, objection handling, and CTAs.
- Making next steps obvious for the prospect.

Your behavior:
- Propose talk tracks, email scripts, or message templates.
- Highlight urgency and risk reversal without being sleazy.
- Suggest one clear CTA, not five competing ones.`;
          break;

        case "product":
        case "offer_build":
        case "delivery":
          categoryGuidance = `
This task is about PRODUCT / DELIVERY.

Focus on:
- Clarifying what is being delivered and how.
- Breaking fuzzy product ideas into concrete components.
- Improving user experience and perceived value.

Your behavior:
- Suggest clearer feature sets or module breakdowns.
- Call out where scope is too big and should be simplified.
- Turn abstract ideas into concrete deliverables.`;
          break;

        case "systems":
        case "ops":
        case "operations":
          categoryGuidance = `
This task is about SYSTEMS / OPERATIONS.

Focus on:
- Turning chaos into repeatable processes.
- Clarifying steps, owners, and tools.
- Simplifying how work flows from A to B.

Your behavior:
- Propose SOP-style steps.
- Identify bottlenecks or single points of failure.
- Suggest ways to track whether the system is working.`;
          break;

        case "research":
        case "validation":
        case "customer_research":
          categoryGuidance = `
This task is about RESEARCH / VALIDATION.

Focus on:
- Clarifying what needs to be learned or tested.
- Proposing lean experiments.
- Generating customer interview questions or survey prompts.

Your behavior:
- Turn vague "understand the market" into concrete questions.
- Suggest scrappy ways to gather data quickly.
- Help the founder avoid overbuilding before validation.`;
          break;

        case "mindset":
        case "clarity":
        case "reflection":
          categoryGuidance = `
This task is about CLARITY / REFLECTION.

Focus on:
- Helping the founder think clearly about decisions.
- Surfacing tradeoffs and priorities.
- Reducing mental noise and overwhelm.

Your behavior:
- Reflect their situation back succinctly.
- Propose simple frameworks or lenses.
- Help them decide on a single next move, not ten.`;
          break;

        default:
          categoryGuidance = `
Task category: ${taskCategory}.

Behavior:
- Infer what success looks like for this category.
- Improve clarity and structure.
- Propose the next concrete step and/or content they can paste.`;
      }
    }

    // Build refinement prompt if in refinement mode
    let refinementPrompt = '';
    if (previousSuggestion && refinementType) {
      const refinementInstructions: Record<string, string> = {
        shorter: 'Make this more concise and tighter. Remove unnecessary words and filler. Keep the core message but cut the length by at least 30%.',
        detailed: 'Expand this with more detail, specific examples, and deeper explanation. Add nuance and supporting points.',
        different: 'Take a completely different angle or approach. Reimagine this content from a fresh perspective while keeping it relevant to the task.',
        actionable: 'Make this more actionable with concrete steps, specific next actions, and clear deliverables the user can execute on immediately.',
      };
      
      refinementPrompt = `

PREVIOUS AI SUGGESTION (user wants to refine this):
"""
${previousSuggestion.slice(0, 6000)}
"""

REFINEMENT REQUEST: ${refinementInstructions[refinementType] || 'Improve this content.'}

Your task: Produce an IMPROVED version based on the refinement request above. 
Output ONLY the refined content, no explanations or meta-commentary about the changes.
`;
    }

    const userPrompt = `
You are helping the founder make progress in this workspace document.

Document metadata:
- Title: ${doc.title || "Untitled"}
- Type: ${doc.doc_type || "unspecified"}

${taskSection}

DOCUMENT-TYPE GUIDANCE:
${docTypeGuidance}

TASK-CATEGORY GUIDANCE:
${categoryGuidance}

Current document content (may be partially filled, messy, or a brain dump):

"""
${currentContent.slice(0, 8000)}
"""
${refinementPrompt}
${!refinementPrompt ? `
Instructions:
1. First, restate briefly what "done" should look like for this document type and task category.
2. Then produce high-quality, ready-to-use content OR a stronger structure.
3. When relevant, propose missing sections.
4. If content is weak, rewrite it.
5. If content is empty, create a strong starting draft.
6. Output plain text only — no JSON, no markdown except headings/bullets.

Your goal: move THIS document and THIS task meaningfully forward.
` : ''}
`;

    // 3) Call Lovable AI Gateway (Gemini 2.5 Flash)

    console.log("Calling Lovable AI gateway...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const aiData = await response.json();
    const suggestion: string =
      aiData.choices?.[0]?.message?.content || "No suggestion generated.";

    console.log("AI suggestion generated, length:", suggestion.length);

    // 4) Return suggestion

    return new Response(
      JSON.stringify({ suggestion }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error in generate-workspace-suggestion:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
