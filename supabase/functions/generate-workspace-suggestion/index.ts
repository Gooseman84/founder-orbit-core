import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    console.log("Task context:", taskContext);
    console.log("Refinement mode:", refinementType ? `Refining with type: ${refinementType}` : "Fresh suggestion");

    // 1) Fetch the document content
    const { data: doc, error: docError } = await supabase
      .from("workspace_documents")
      .select("id, title, content, doc_type")
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

    const currentContent: string = doc.content || "";

    // 2) Build prompts with TASK COPILOT framing

    const systemPrompt = `
You are an AI cofounder helping an ambitious founder complete one task at a time.

Your job:
- Look at the current task (if provided) and the current document content.
- Help the founder make tangible progress on THAT task, not generic advice.
- Suggest structure, drafts, and concrete next steps that can be directly pasted into the document.

Tone:
- Direct, practical, supportive.
- No fluffy self-help language.
- Write as if you're sitting next to them in a working session, pushing the work forward.

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
