import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { documentId, taskContext } = await req.json() as {
      documentId: string;
      taskContext?: TaskContext;
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

    const userPrompt = `
You are helping the founder make progress in this workspace document.

Document metadata:
- Title: ${doc.title || "Untitled"}
- Type: ${doc.doc_type || "unspecified"}

${taskSection}

DOCUMENT-TYPE GUIDANCE:
${docTypeGuidance}

Current document content (may be partially filled, messy, or a brain dump):

"""
${currentContent.slice(0, 8000)}
"""

Instructions:
1. First, restate briefly what "done" should look like for this document type.
2. Then produce high-quality, ready-to-use content OR a stronger structure.
3. When relevant, propose missing sections.
4. If content is weak, rewrite it.
5. If content is empty, create a strong starting draft.
6. Output plain text only — no JSON, no markdown except headings/bullets.

Your goal: move THIS document and THIS task meaningfully forward.
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
