import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  userId: string;
  bugDescription: string;
  errorMessage?: string;
  affectedFiles?: string;
  severity?: "high" | "medium" | "low";
}

interface AnalysisResult {
  rootCause: string;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  affectedFiles: string[];
  fixPrompt: string;
  estimatedFixTime: string;
  testingSteps: string[];
}

const systemPrompt = `You are the Code Architect Agent for TrueBlazer AI, a React/TypeScript application built with Lovable.dev, Supabase backend, and 42 edge functions for AI-powered operations.

Your mission: Analyze bugs and generate production-ready Lovable prompts to fix them.

## TrueBlazer Tech Stack
- Frontend: React 18, TypeScript, Vite, shadcn/ui components
- Backend: Supabase (PostgreSQL + Edge Functions + Realtime + Auth)
- State Management: React Query (TanStack Query)
- Routing: React Router v6
- Styling: Tailwind CSS
- AI: Anthropic Claude (via edge functions)
- Payments: Stripe

## Your Analysis Framework

1. **Understand the Bug**
   - What is the user trying to do?
   - What is the expected behavior?
   - What is the actual behavior?
   - What error message appears?

2. **Identify Root Cause**
   - Don't fix symptoms, find the real issue
   - Check for: null/undefined values, async timing issues, missing error handling, incorrect state management, broken API calls

3. **Design the Fix**
   - Minimal changes (surgical fix, not refactor)
   - Maintain existing patterns
   - Add error handling
   - Consider edge cases

4. **Generate Lovable Prompt**
   - Complete, copy-paste ready
   - Includes file path, exact code changes
   - Explains what changed and why
   - Includes testing steps

## Output Format (JSON only)

{
  "rootCause": "Brief explanation of what's actually broken",
  "confidence": 85,
  "riskLevel": "low" | "medium" | "high",
  "affectedFiles": ["file1.ts", "file2.tsx"],
  "fixPrompt": "Complete Lovable prompt to paste...",
  "estimatedFixTime": "10 minutes",
  "testingSteps": [
    "Navigate to Ideas page",
    "Click Save Idea",
    "Verify idea saves successfully"
  ]
}

## Self-Critique Checklist

Before outputting, verify:
- Root cause is specific, not vague
- Fix is minimal and surgical
- Lovable prompt is complete and copy-paste ready
- Risk level is accurate
- Confidence score is justified`;

async function callAnthropicAPI(
  bugDescription: string,
  errorMessage: string,
  affectedFiles: string,
  severity: string,
  retryCount = 0
): Promise<AnalysisResult> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const userMessage = `Analyze this bug and generate a fix prompt:

**Bug Description:** ${bugDescription}

**Error Message:** ${errorMessage || "None provided"}

**Affected Files:** ${affectedFiles || "Unknown"}

**Severity:** ${severity || "medium"}

Generate a production-ready Lovable prompt to fix this bug.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      throw new Error(`Anthropic API failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No text content in Claude response");
    }

    // Parse JSON response
    let jsonStr = content.trim();

    // Remove potential markdown code blocks
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    const result = JSON.parse(jsonStr) as AnalysisResult;

    // Validate required fields
    if (!result.rootCause || typeof result.confidence !== "number" || !result.fixPrompt) {
      throw new Error("Missing required fields in response");
    }

    // Ensure confidence is within bounds
    result.confidence = Math.max(0, Math.min(100, result.confidence));

    // Ensure riskLevel is valid
    if (!["low", "medium", "high"].includes(result.riskLevel)) {
      result.riskLevel = "medium";
    }

    return result;
  } catch (error) {
    console.error("Claude API error:", error);

    // Retry once on failure
    if (retryCount === 0) {
      console.log("Retrying Claude API call...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return callAnthropicAPI(bugDescription, errorMessage, affectedFiles, severity, 1);
    }

    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.slice(7).trim(); // Remove 'Bearer '

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, bugDescription, errorMessage, affectedFiles, severity } = body;

    // Validate required fields
    if (!userId || !bugDescription) {
      return new Response(
        JSON.stringify({
          error: "Bad Request - missing required fields",
          required: ["userId", "bugDescription"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - userId mismatch" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing bug analysis for user ${userId}`);
    console.log("Bug:", bugDescription);

    // Call Anthropic API
    let analysis: AnalysisResult;
    try {
      analysis = await callAnthropicAPI(
        bugDescription,
        errorMessage || "",
        affectedFiles || "",
        severity || "medium"
      );
    } catch (apiError) {
      console.error("Anthropic API error:", apiError);
      return new Response(
        JSON.stringify({
          error: "AI analysis failed",
          message: apiError instanceof Error ? apiError.message : "Unknown error",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client for database operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store analysis in agent_memory
    const { error: memoryError } = await adminClient
      .from("agent_memory")
      .upsert({
        user_id: userId,
        memory_path: `engineering/bug_analysis/${Date.now()}`,
        memory_data: analysis,
        updated_at: new Date().toISOString(),
      });

    if (memoryError) {
      console.error("Failed to store in agent_memory:", memoryError);
    }

    // Log decision in agent_decisions
    const { error: decisionError } = await adminClient
      .from("agent_decisions")
      .insert({
        user_id: userId,
        agent_name: "code_architect",
        decision_type: "bug_analysis",
        inputs: { bugDescription, errorMessage, affectedFiles, severity },
        outputs: analysis,
        reasoning: analysis.rootCause,
        confidence: analysis.confidence,
        risk_level: analysis.riskLevel,
        requires_approval: true,
        created_at: new Date().toISOString(),
      });

    if (decisionError) {
      console.error("Failed to log decision:", decisionError);
    }

    console.log(`Analysis complete. Confidence: ${analysis.confidence}, Risk: ${analysis.riskLevel}`);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        analysis,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
