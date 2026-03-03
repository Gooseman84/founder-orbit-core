import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Call Anthropic API
    const anthropic = new Anthropic({ apiKey: anthropicApiKey });
    
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      temperature: 0.5,
      messages: [
        {
          role: "user",
          content: correctionPrompt,
        },
      ],
    });

    // Extract response text
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

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
  return `You previously analyzed a founder interview and produced this summary:

${JSON.stringify(existingContext, null, 2)}

The founder has reviewed this summary and provided the following corrections:

SPECIFIC CORRECTIONS:
${corrections.corrections.insiderKnowledge ? `- Insider Knowledge: "${corrections.corrections.insiderKnowledge}"` : "- Insider Knowledge: (no changes)"}
${corrections.corrections.customerIntimacy ? `- Customer Intimacy: "${corrections.corrections.customerIntimacy}"` : "- Customer Intimacy: (no changes)"}
${corrections.corrections.constraints ? `- Constraints: "${corrections.corrections.constraints}"` : "- Constraints: (no changes)"}
${corrections.corrections.financialTarget ? `- Financial Target: "${corrections.corrections.financialTarget}"` : "- Financial Target: (no changes)"}
${corrections.corrections.hardNoFilters ? `- Hard No Filters: "${corrections.corrections.hardNoFilters}"` : "- Hard No Filters: (no changes)"}

${corrections.additionalContext ? `ADDITIONAL CONTEXT FROM FOUNDER:\n"${corrections.additionalContext}"` : ""}

INSTRUCTIONS:
1. Regenerate the founder summary incorporating these corrections
2. Update the extractedInsights to reflect the corrections
3. Update the ideaGenerationContext to include this new information
4. Keep the same JSON structure as the original
5. For fields the founder didn't correct, keep the original values
6. Where the founder provided corrections, integrate their input naturally
7. Update confidence levels if the corrections provide clarity

Return ONLY the updated JSON object with no additional text or explanation. The JSON should have the exact same structure as the original:

{
  "extractedInsights": { ... },
  "founderSummary": "...",
  "confidenceLevel": { ... },
  "ideaGenerationContext": "..."
}`;
}
