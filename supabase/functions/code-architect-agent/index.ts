import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

// Helper: Read a specific file from the codebase
async function readCodebaseFile(filePath: string): Promise<string | null> {
  try {
    // In production, this would read from your Git repository or file system
    // For now, we'll use a simulated file reading approach
    
    // Note: Lovable projects don't have direct filesystem access from edge functions
    // This is a placeholder for when you integrate with GitHub API or similar
    
    console.log(`[Code Architect] Attempting to read file: ${filePath}`);
    
    // TODO: Integrate with GitHub API to read actual file contents
    // For now, return null to indicate file reading is not yet implemented
    return null;
  } catch (error) {
    console.error(`[Code Architect] Error reading file ${filePath}:`, error);
    return null;
  }
}

// Helper: Infer likely files based on error message
function inferAffectedFiles(bugDescription: string, errorMessage: string): string[] {
  const files: string[] = [];
  
  // Extract file paths from error stack traces
  const stackTraceRegex = /at\s+(?:.*?\s+)?\(?([^)]+\.(?:tsx?|jsx?))/g;
  let match;
  
  while ((match = stackTraceRegex.exec(errorMessage)) !== null) {
    if (!files.includes(match[1])) {
      files.push(match[1]);
    }
  }
  
  // Also check for explicit file paths in the error message
  const filePathRegex = /(?:src|supabase)\/[^\s:)]+\.(?:tsx?|ts)/g;
  let pathMatch;
  while ((pathMatch = filePathRegex.exec(errorMessage)) !== null) {
    const path = `/${pathMatch[0]}`;
    if (!files.includes(path)) {
      files.push(path);
    }
  }
  
  // Infer common patterns from bug description
  const lowerDesc = bugDescription.toLowerCase();
  const lowerError = errorMessage.toLowerCase();
  
  if (lowerDesc.includes('idea') || lowerError.includes('idea')) {
    if (!files.some(f => f.includes('Ideas') || f.includes('idea'))) {
      files.push('/src/pages/Ideas.tsx', '/src/hooks/useIdeas.tsx', '/src/hooks/useFounderIdeas.ts');
    }
  }
  
  if (lowerDesc.includes('blueprint') || lowerError.includes('blueprint')) {
    if (!files.some(f => f.includes('Blueprint') || f.includes('blueprint'))) {
      files.push('/src/pages/Blueprint.tsx', '/src/hooks/useBlueprint.ts', '/src/components/blueprint/BusinessBlueprint.tsx');
    }
  }
  
  if (lowerDesc.includes('task') || lowerError.includes('task')) {
    if (!files.some(f => f.includes('Task') || f.includes('task'))) {
      files.push('/src/pages/Tasks.tsx', '/src/hooks/useVentureTasks.ts', '/src/components/tasks/TaskCard.tsx');
    }
  }
  
  if (lowerDesc.includes('venture') || lowerError.includes('venture')) {
    if (!files.some(f => f.includes('Venture') || f.includes('venture'))) {
      files.push('/src/hooks/useVentureState.ts', '/src/hooks/useActiveVenture.ts', '/src/pages/VentureReview.tsx');
    }
  }
  
  if (lowerDesc.includes('auth') || lowerError.includes('auth') || lowerDesc.includes('login') || lowerDesc.includes('signup')) {
    if (!files.some(f => f.includes('Auth') || f.includes('auth'))) {
      files.push('/src/pages/Auth.tsx', '/src/hooks/useAuth.tsx', '/src/components/auth/ProtectedRoute.tsx');
    }
  }
  
  if (lowerDesc.includes('profile') || lowerError.includes('profile')) {
    if (!files.some(f => f.includes('Profile') || f.includes('profile'))) {
      files.push('/src/pages/Profile.tsx', '/src/hooks/useFounderProfile.ts', '/src/lib/founderProfileApi.ts');
    }
  }
  
  if (lowerDesc.includes('onboarding') || lowerError.includes('onboarding')) {
    if (!files.some(f => f.includes('Onboarding') || f.includes('onboarding'))) {
      files.push('/src/pages/Onboarding.tsx', '/src/features/onboarding/CoreOnboardingWizard.tsx');
    }
  }
  
  if (lowerDesc.includes('dashboard') || lowerError.includes('dashboard')) {
    if (!files.some(f => f.includes('Dashboard') || f.includes('dashboard'))) {
      files.push('/src/pages/Dashboard.tsx', '/src/components/dashboard/ExecutionDashboard.tsx');
    }
  }
  
  if (lowerDesc.includes('stripe') || lowerDesc.includes('payment') || lowerDesc.includes('billing')) {
    files.push('/src/pages/Billing.tsx', '/supabase/functions/create-checkout-session/index.ts', '/supabase/functions/stripe-webhook/index.ts');
  }
  
  if (lowerError.includes('supabase') || lowerError.includes('edge function')) {
    files.push('/src/integrations/supabase/client.ts');
  }
  
  if (lowerDesc.includes('workspace') || lowerError.includes('workspace')) {
    files.push('/src/pages/Workspace.tsx', '/src/hooks/useWorkspace.ts', '/src/components/workspace/WorkspaceEditor.tsx');
  }
  
  if (lowerDesc.includes('reflection') || lowerError.includes('reflection')) {
    files.push('/src/pages/DailyReflection.tsx', '/src/components/reflection/DailyReflectionForm.tsx');
  }
  
  if (lowerDesc.includes('pulse') || lowerError.includes('pulse')) {
    files.push('/src/pages/Pulse.tsx', '/src/components/pulse/PulseForm.tsx');
  }
  
  return files;
}

// Helper: Suggest related files to check
function suggestRelatedFiles(affectedFiles: string[]): string[] {
  const related: string[] = [];
  
  affectedFiles.forEach(file => {
    // If it's a page, suggest the corresponding hook
    if (file.includes('/pages/') && file.endsWith('.tsx')) {
      const pageName = file.split('/').pop()?.replace('.tsx', '');
      if (pageName) {
        related.push(`/src/hooks/use${pageName}.ts`);
        related.push(`/src/hooks/use${pageName}.tsx`);
      }
    }
    
    // If it's a hook, suggest the corresponding page
    if (file.includes('/hooks/use') && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      const hookName = file.split('/').pop()?.replace('use', '').replace('.tsx', '').replace('.ts', '');
      if (hookName) {
        related.push(`/src/pages/${hookName}.tsx`);
      }
    }
    
    // Suggest common dependencies based on file patterns
    if (file.includes('Ideas') || file.includes('idea')) {
      related.push('/src/integrations/supabase/client.ts');
      related.push('/supabase/functions/generate-founder-ideas/index.ts');
      related.push('/supabase/functions/save-founder-idea/index.ts');
      related.push('/src/store/ideaSessionStore.ts');
    }
    
    if (file.includes('Blueprint') || file.includes('blueprint')) {
      related.push('/src/hooks/useVentureState.ts');
      related.push('/supabase/functions/generate-blueprint/index.ts');
      related.push('/supabase/functions/refresh-blueprint/index.ts');
      related.push('/src/types/blueprint.ts');
    }
    
    if (file.includes('Venture') || file.includes('venture')) {
      related.push('/src/hooks/useActiveVenture.ts');
      related.push('/src/hooks/useVenturePlans.ts');
      related.push('/src/types/venture.ts');
    }
    
    if (file.includes('Task') || file.includes('task')) {
      related.push('/src/hooks/useDailyExecution.ts');
      related.push('/supabase/functions/generate-daily-execution-tasks/index.ts');
      related.push('/src/types/tasks.ts');
    }
    
    if (file.includes('Auth') || file.includes('auth')) {
      related.push('/src/integrations/supabase/client.ts');
      related.push('/src/components/auth/ProtectedRoute.tsx');
    }
    
    if (file.includes('Profile') || file.includes('profile')) {
      related.push('/src/lib/founderProfileApi.ts');
      related.push('/supabase/functions/normalize-founder-profile/index.ts');
      related.push('/src/types/founderProfile.ts');
    }
  });
  
  // Remove duplicates and filter out files already in affected
  return [...new Set(related)].filter(f => !affectedFiles.includes(f));
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
  userMessage: string,
  retryCount = 0
): Promise<AnalysisResult> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

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
      return callAnthropicAPI(userMessage, 1);
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

    console.log(`[Code Architect] Processing bug analysis for user ${userId}`);
    console.log(`[Code Architect] Bug: ${bugDescription}`);

    // Infer affected files if not provided
    let filesArray = affectedFiles ? affectedFiles.split(',').map(f => f.trim()) : [];
    if (filesArray.length === 0) {
      filesArray = inferAffectedFiles(bugDescription, errorMessage || '');
      console.log('[Code Architect] Inferred files:', filesArray);
    }

    // Suggest related files to check
    const relatedFiles = suggestRelatedFiles(filesArray);
    console.log('[Code Architect] Related files:', relatedFiles);

    // Attempt to read file contents (currently returns null, placeholder for future)
    const fileContents: Record<string, string | null> = {};
    for (const file of filesArray.slice(0, 5)) { // Limit to first 5 files
      fileContents[file] = await readCodebaseFile(file);
    }

    const filesWithContent = Object.keys(fileContents).filter(k => fileContents[k] !== null);

    // Build enhanced user message with file information
    const enhancedUserMessage = `Analyze this bug and generate a fix prompt:

**Bug Description:** ${bugDescription}

**Error Message:** ${errorMessage || 'None provided'}

**Severity:** ${severity || 'medium'}

**Affected Files:** ${filesArray.join(', ')}

**Related Files to Consider:** ${relatedFiles.length > 0 ? relatedFiles.join(', ') : 'None inferred'}

**File Contents Available:** ${filesWithContent.length > 0 ? 'Yes' : 'No (using inference based on TrueBlazer codebase patterns)'}

${filesWithContent.length > 0 ? `**File Contents:**\n${filesWithContent.map(f => `--- ${f} ---\n${fileContents[f]}`).join('\n\n')}` : ''}

Generate a production-ready Lovable prompt to fix this bug.`;

    // Call Anthropic API
    let analysis: AnalysisResult;
    try {
      analysis = await callAnthropicAPI(enhancedUserMessage);
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
        memory_data: {
          ...analysis,
          inferredFiles: filesArray,
          relatedFiles: relatedFiles,
        },
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
        inputs: { 
          bugDescription, 
          errorMessage, 
          affectedFiles,
          severity,
          inferredFiles: filesArray,
          relatedFiles: relatedFiles,
        },
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

    console.log(`[Code Architect] Analysis complete. Confidence: ${analysis.confidence}, Risk: ${analysis.riskLevel}`);

    // Return response with additional file inference info
    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        metadata: {
          inferredFiles: filesArray,
          relatedFiles: relatedFiles,
          fileContentsAvailable: filesWithContent.length > 0,
        },
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
