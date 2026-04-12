import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Detects whether context_summary uses old or new schema.
 */
function isNewSchema(ctx: any): boolean {
  return !!(ctx?.domainExpertise || ctx?.interviewSignalQuality || ctx?.customerPain);
}

interface CorrectionFields {
  insiderKnowledge: string | null;
  customerIntimacy: string | null;
  constraints: string | null;
  financialTarget: string | null;
  hardNoFilters: string | null;
}

interface CorrectionsPayload {
  corrections: CorrectionFields;
  additionalContext: string | null;
}

interface RequestBody {
  interviewId: string;
  corrections: CorrectionsPayload;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Create Supabase client with user's auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const token = authHeader.slice(7).trim();
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
    const { interviewId, corrections } = body;

    if (!interviewId || !corrections) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: interviewId, corrections" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch existing interview
    const { data: interview, error: fetchError } = await supabaseAuth
      .from("founder_interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !interview) {
      return new Response(
        JSON.stringify({ error: "Interview not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingContextSummary = interview.context_summary;

    if (!existingContextSummary) {
      return new Response(
        JSON.stringify({ error: "Interview has no context summary to correct" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the correction prompt
    const correctionPrompt = buildCorrectionPrompt(existingContextSummary, corrections);

    // Call Lovable AI Gateway
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: correctionPrompt }],
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "";

    // Parse the updated JSON
    let updatedInsights;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      updatedInsights = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse corrected insights. Please try again.",
          details: parseError instanceof Error ? parseError.message : "Unknown parse error"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Append corrections to transcript for record
    const correctionRecord = {
      role: "system",
      content: `User corrections applied: ${JSON.stringify(corrections)}`,
      timestamp: new Date().toISOString(),
    };

    const updatedTranscript = [...(interview.transcript || []), correctionRecord];

    // Update founder_interviews with corrected data
    const { error: updateError } = await supabaseAuth
      .from("founder_interviews")
      .update({
        context_summary: updatedInsights,
        transcript: updatedTranscript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interviewId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to update interview:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save corrected insights" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights: updatedInsights,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Error in mavrik-apply-corrections:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildCorrectionPrompt(
  existingContext: any,
  corrections: CorrectionsPayload
): string {
  const useNewSchema = isNewSchema(existingContext);

  const correctionsList = [];
  if (corrections.corrections.insiderKnowledge) {
    correctionsList.push(
      useNewSchema
        ? `- Domain Expertise / Specific Knowledge: "${corrections.corrections.insiderKnowledge}"`
        : `- Insider Knowledge: "${corrections.corrections.insiderKnowledge}"`
    );
  } else {
    correctionsList.push(
      useNewSchema
        ? "- Domain Expertise / Specific Knowledge: (no changes)"
        : "- Insider Knowledge: (no changes)"
    );
  }

  if (corrections.corrections.customerIntimacy) {
    correctionsList.push(
      useNewSchema
        ? `- Customer Pain / Target Role: "${corrections.corrections.customerIntimacy}"`
        : `- Customer Intimacy: "${corrections.corrections.customerIntimacy}"`
    );
  } else {
    correctionsList.push(
      useNewSchema
        ? "- Customer Pain / Target Role: (no changes)"
        : "- Customer Intimacy: (no changes)"
    );
  }

  if (corrections.corrections.constraints) {
    correctionsList.push(`- Constraints: "${corrections.corrections.constraints}"`);
  } else {
    correctionsList.push("- Constraints: (no changes)");
  }

  if (corrections.corrections.financialTarget) {
    correctionsList.push(`- Financial/Revenue Target: "${corrections.corrections.financialTarget}"`);
  } else {
    correctionsList.push("- Financial/Revenue Target: (no changes)");
  }

  if (corrections.corrections.hardNoFilters) {
    correctionsList.push(`- Hard No Filters: "${corrections.corrections.hardNoFilters}"`);
  } else {
    correctionsList.push("- Hard No Filters: (no changes)");
  }

  const structureInstructions = useNewSchema
    ? `Return ONLY the updated JSON object. Keep the EXACT SAME STRUCTURE as the original, which uses these top-level keys:
{
  "interviewSignalQuality": { ... },
  "domainExpertise": { ... },
  "customerPain": { ... },
  "ventureIntelligence": { ... },
  "transferablePatterns": [ ... ],
  "keyQuotes": [ ... ],
  "redFlags": [ ... ],
  "founderSummary": "...",
  "ideaGenerationContext": "..."
}
When applying corrections:
- "Domain Expertise" corrections should update domainExpertise.specificKnowledge and domainExpertise.abstractExpertise
- "Customer Pain" corrections should update customerPain.targetRole, customerPain.specificProblem, and customerPain.painPoints
- "Constraints" corrections should be noted in the founderSummary and ideaGenerationContext (constraints now live in profile columns, not the interview summary)
- "Hard No Filters" corrections should be noted in the founderSummary (hell_no_filters now live in profile columns)
- Update interviewSignalQuality confidence levels if corrections provide clarity`
    : `Return ONLY the updated JSON object with the exact same structure as the original:
{
  "extractedInsights": { ... },
  "founderSummary": "...",
  "confidenceLevel": { ... },
  "ideaGenerationContext": "..."
}`;

  return `You previously analyzed a founder interview and produced this summary:

${JSON.stringify(existingContext, null, 2)}

The founder has reviewed this summary and provided the following corrections:

SPECIFIC CORRECTIONS:
${correctionsList.join("\n")}

${corrections.additionalContext ? `ADDITIONAL CONTEXT FROM FOUNDER:\n"${corrections.additionalContext}"` : ""}

INSTRUCTIONS:
1. Regenerate the founder summary incorporating these corrections
2. Update all relevant fields to reflect the corrections
3. Update the ideaGenerationContext to include this new information
4. For fields the founder didn't correct, keep the original values
5. Where the founder provided corrections, integrate their input naturally
6. Update confidence/signal quality levels if the corrections provide clarity

${structureInstructions}`;
}
