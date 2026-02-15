// supabase/functions/mavrik-interview/index.ts
// Powers the Mavrik conversational interview flow

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { buildSystemPrompt } from "./mavrik-system-prompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InterviewTurn {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface RequestBody {
  userId?: string;
  interviewId?: string | null;
  userMessage?: string;
  turnNumber: number;
}

interface FounderContext {
  entry_trigger: string | null;
  future_vision: string | null;
  desired_identity: string | null;
  business_type_preference: string | null;
  energy_source: string | null;
  learning_style: string | null;
  commitment_level_text: string | null;
}

// Rate limiting: track calls per interview
const interviewCallCounts = new Map<string, number>();
const MAX_CALLS_PER_INTERVIEW = 10;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Missing Supabase environment configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!anthropicApiKey) {
      console.error("Missing ANTHROPIC_API_KEY");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== CANONICAL AUTH BLOCK =====
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

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("mavrik-interview: auth error", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized", code: "AUTH_SESSION_MISSING" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resolvedUserId = claimsData.claims.sub as string;
    
    // Service role client for DB operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // ===== PARSE REQUEST BODY =====
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const { interviewId, userMessage, turnNumber } = body;

    // Verify userId matches if provided
    if (body.userId && body.userId !== resolvedUserId) {
      return new Response(
        JSON.stringify({ error: "User ID mismatch" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof turnNumber !== "number" || turnNumber < 0 || turnNumber > 5) {
      return new Response(
        JSON.stringify({ error: "Invalid turnNumber. Must be 0-5." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== FETCH ONBOARDING DATA =====
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("entry_trigger, future_vision, desired_identity, business_type_preference, energy_source, learning_style, commitment_level_text")
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (profileError) {
      console.error("mavrik-interview: error fetching founder profile", profileError);
    }

    const founderContext: FounderContext = {
      entry_trigger: profile?.entry_trigger ?? null,
      future_vision: profile?.future_vision ?? null,
      desired_identity: profile?.desired_identity ?? null,
      business_type_preference: profile?.business_type_preference ?? null,
      energy_source: profile?.energy_source ?? null,
      learning_style: profile?.learning_style ?? null,
      commitment_level_text: profile?.commitment_level_text ?? null,
    };

    // ===== TURN 0: START NEW INTERVIEW =====
    if (turnNumber === 0) {
      // Create new interview row
      const { data: newInterview, error: createError } = await supabase
        .from("founder_interviews")
        .insert({
          user_id: resolvedUserId,
          transcript: [],
          status: "in_progress",
        })
        .select("*")
        .single();

      if (createError || !newInterview) {
        console.error("mavrik-interview: error creating interview", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create interview" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newInterviewId = newInterview.id as string;
      interviewCallCounts.set(newInterviewId, 1);

      // Build system prompt with founder context
      const systemPrompt = buildSystemPrompt(founderContext);
      console.log("[mavrik-interview] System prompt length:", systemPrompt.length, "Contains intelligence layers:", systemPrompt.includes("INTELLIGENCE DETECTION LAYERS"));

      // Call Anthropic API
      const aiResponse = await callAnthropic(anthropicApiKey, systemPrompt, [], "Begin the interview.");
      console.log("[mavrik-interview] AI response preview:", aiResponse.content?.substring(0, 200));

      if (aiResponse.error) {
        return new Response(
          JSON.stringify({ error: aiResponse.error, retryable: true }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Store the AI turn in transcript
      const aiTurn: InterviewTurn = {
        role: "assistant",
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("founder_interviews")
        .update({ transcript: [aiTurn], updated_at: new Date().toISOString() })
        .eq("id", newInterviewId);

      if (updateError) {
        console.error("mavrik-interview: error updating transcript", updateError);
      }

      return new Response(
        JSON.stringify({
          interviewId: newInterviewId,
          aiMessage: aiResponse.content,
          turnNumber: 1,
          complete: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== TURN >= 1: CONTINUE INTERVIEW =====
    if (!interviewId) {
      return new Response(
        JSON.stringify({ error: "interviewId required for turnNumber >= 1" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userMessage || !userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "userMessage required for turnNumber >= 1" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const currentCalls = interviewCallCounts.get(interviewId) ?? 0;
    if (currentCalls >= MAX_CALLS_PER_INTERVIEW) {
      return new Response(
        JSON.stringify({ error: "Maximum interview calls exceeded. Please start a new interview." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    interviewCallCounts.set(interviewId, currentCalls + 1);

    // Fetch existing interview
    const { data: existingInterview, error: fetchError } = await supabase
      .from("founder_interviews")
      .select("*")
      .eq("id", interviewId)
      .eq("user_id", resolvedUserId)
      .maybeSingle();

    if (fetchError || !existingInterview) {
      console.error("mavrik-interview: error fetching interview", fetchError);
      return new Response(
        JSON.stringify({ error: "Interview not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let transcript: InterviewTurn[] = Array.isArray(existingInterview.transcript)
      ? (existingInterview.transcript as InterviewTurn[])
      : [];

    // Append user message to transcript
    const userTurn: InterviewTurn = {
      role: "user",
      content: userMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    transcript = [...transcript, userTurn];

    // Build system prompt
    const systemPrompt = buildSystemPrompt(founderContext);
    console.log("[mavrik-interview] System prompt length:", systemPrompt.length, "Contains intelligence layers:", systemPrompt.includes("INTELLIGENCE DETECTION LAYERS"));

    // Call Anthropic with full transcript
    const aiResponse = await callAnthropic(anthropicApiKey, systemPrompt, transcript, null);
    console.log("[mavrik-interview] AI response preview:", aiResponse.content?.substring(0, 200));

    if (aiResponse.error) {
      // If JSON parsing failed on completion, ask for retry
      if (aiResponse.retryParsing) {
        const retryResponse = await callAnthropic(
          anthropicApiKey,
          systemPrompt,
          transcript,
          "Your previous completion response had invalid JSON. Please respond with [INTERVIEW_COMPLETE] followed by valid JSON matching the exact schema specified in your instructions."
        );
        
        if (!retryResponse.error) {
          return handleAIResponse(supabase, interviewId, transcript, retryResponse.content, turnNumber);
        }
      }

      return new Response(
        JSON.stringify({ error: aiResponse.error, retryable: true }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return handleAIResponse(supabase, interviewId, transcript, aiResponse.content, turnNumber);

  } catch (error) {
    console.error("mavrik-interview: unexpected error", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleAIResponse(
  supabase: ReturnType<typeof createClient>,
  interviewId: string,
  transcript: InterviewTurn[],
  aiContent: string,
  turnNumber: number
): Promise<Response> {
  // Check if interview is complete
  const isComplete = aiContent.includes("[INTERVIEW_COMPLETE]");

  if (!isComplete) {
    // Append AI response to transcript
    const aiTurn: InterviewTurn = {
      role: "assistant",
      content: aiContent,
      timestamp: new Date().toISOString(),
    };
    const updatedTranscript = [...transcript, aiTurn];

    const { error: updateError } = await supabase
      .from("founder_interviews")
      .update({
        transcript: updatedTranscript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", interviewId);

    if (updateError) {
      console.error("mavrik-interview: error updating transcript", updateError);
    }

    return new Response(
      JSON.stringify({
        interviewId,
        aiMessage: aiContent,
        turnNumber: turnNumber + 1,
        complete: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse completion JSON
  const jsonMatch = aiContent.match(/\[INTERVIEW_COMPLETE\]\s*({[\s\S]*})/);
  if (!jsonMatch) {
    console.error("mavrik-interview: could not extract completion JSON");
    return new Response(
      JSON.stringify({ error: "Failed to parse completion response", retryable: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let insights: any;
  try {
    insights = JSON.parse(jsonMatch[1]);
  } catch (e) {
    console.error("mavrik-interview: JSON parse error", e);
    return new Response(
      JSON.stringify({ error: "Invalid completion JSON format", retryable: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update interview as completed
  const { error: completeError } = await supabase
    .from("founder_interviews")
    .update({
      transcript,
      context_summary: insights,
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", interviewId);

  if (completeError) {
    console.error("mavrik-interview: error completing interview", completeError);
  }

  return new Response(
    JSON.stringify({
      interviewId,
      aiMessage: null,
      turnNumber: turnNumber + 1,
      complete: true,
      insights,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  transcript: InterviewTurn[],
  additionalUserMessage: string | null
): Promise<{ content: string; error?: string; retryParsing?: boolean }> {
  try {
    // Build messages array for Anthropic
    const messages: { role: "user" | "assistant"; content: string }[] = [];

    // Add transcript history
    for (const turn of transcript) {
      messages.push({
        role: turn.role === "assistant" ? "assistant" : "user",
        content: turn.content,
      });
    }

    // Add additional user message if provided
    if (additionalUserMessage) {
      messages.push({ role: "user", content: additionalUserMessage });
    }

    // Ensure messages alternate properly and start with user
    // If empty or starts with assistant, add a starter
    if (messages.length === 0 || messages[0].role === "assistant") {
      messages.unshift({ role: "user", content: "Begin the interview." });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        temperature: 0.7,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("mavrik-interview: Anthropic API error", response.status, errorText);
      return { content: "", error: "AI service temporarily unavailable. Please try again." };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "";

    if (!content) {
      return { content: "", error: "AI returned empty response. Please try again." };
    }

    return { content };
  } catch (e) {
    console.error("mavrik-interview: Anthropic call failed", e);
    return { content: "", error: "Failed to connect to AI service. Please try again." };
  }
}
