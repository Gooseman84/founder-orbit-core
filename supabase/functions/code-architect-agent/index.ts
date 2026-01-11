import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Types
interface TaskContext {
  issue_description: string;
  error_logs: string[];
  affected_files?: string[];
  severity: "critical" | "high" | "medium" | "low";
  user_reports?: string[];
}

interface Task {
  type: "analyze_bug" | "design_fix" | "code_review";
  context: TaskContext;
}

interface RequestBody {
  userId: string;
  task: Task;
}

interface FixPlan {
  steps: string[];
  files_to_modify: string[];
  new_dependencies: string[];
  database_migrations: string[];
}

interface AnalysisResult {
  root_cause: string;
  affected_components: string[];
  explanation: string;
  fix_plan: FixPlan;
  lovable_prompt: string;
  test_cases: string[];
  confidence: number;
  estimated_time: string;
  risk_level: "low" | "medium" | "high" | "critical";
}

// ============================================
// FILE READING UTILITIES
// ============================================

// Helper function to read a single codebase file
async function readCodeFile(filePath: string): Promise<string> {
  try {
    // Normalize path - remove leading slash if present
    const normalizedPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    
    // Try multiple possible locations for the file
    const possiblePaths = [
      `/var/task/${normalizedPath}`,
      `./${normalizedPath}`,
      normalizedPath,
    ];
    
    for (const fullPath of possiblePaths) {
      try {
        const content = await Deno.readTextFile(fullPath);
        console.log(`Successfully read file: ${filePath} from ${fullPath}`);
        return content;
      } catch {
        // Try next path
        continue;
      }
    }
    
    // If we couldn't read the file, return a message
    console.warn(`Could not read file from any path: ${filePath}`);
    return `// File not accessible: ${filePath}\n// Note: File reading may be limited in edge function environment`;
  } catch (error) {
    console.error(`Failed to read file: ${filePath}`, error);
    return `// File not found or not accessible: ${filePath}`;
  }
}

// Helper to read multiple files
async function readCodeFiles(filePaths: string[]): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  
  // Read files in parallel for efficiency
  const results = await Promise.allSettled(
    filePaths.map(async (path) => ({
      path,
      content: await readCodeFile(path),
    }))
  );
  
  for (const result of results) {
    if (result.status === "fulfilled") {
      files[result.value.path] = result.value.content;
    }
  }
  
  return files;
}

// ============================================
// FILE INFERENCE UTILITIES
// ============================================

// Common TrueBlazer function-to-file mappings
const FUNCTION_FILE_MAPPINGS: Record<string, string[]> = {
  "generate-blueprint": ["supabase/functions/generate-blueprint/index.ts"],
  "stripe-webhook": ["supabase/functions/stripe-webhook/index.ts"],
  "generate-ideas": ["supabase/functions/generate-ideas/index.ts", "src/lib/ideaEngine.ts"],
  "generate-venture-plan": ["supabase/functions/generate-venture-plan/index.ts"],
  "generate-daily-execution-tasks": ["supabase/functions/generate-daily-execution-tasks/index.ts"],
  "code-architect-agent": ["supabase/functions/code-architect-agent/index.ts"],
  "analyze-idea": ["supabase/functions/analyze-idea/index.ts"],
  "generate-pulse-check": ["supabase/functions/generate-pulse-check/index.ts"],
  "generate-niche-radar": ["supabase/functions/generate-niche-radar/index.ts"],
  "useBlueprint": ["src/hooks/useBlueprint.ts"],
  "useVentureState": ["src/hooks/useVentureState.ts"],
  "useAuth": ["src/hooks/useAuth.tsx"],
  "useSubscription": ["src/hooks/useSubscription.ts"],
  "useNorthStarVenture": ["src/hooks/useNorthStarVenture.ts"],
  "useDailyExecution": ["src/hooks/useDailyExecution.ts"],
  "Dashboard": ["src/pages/Dashboard.tsx", "src/components/dashboard/DiscoveryDashboard.tsx", "src/components/dashboard/ExecutionDashboard.tsx"],
  "Blueprint": ["src/pages/Blueprint.tsx", "src/components/blueprint/BusinessBlueprint.tsx"],
  "VentureReview": ["src/pages/VentureReview.tsx"],
  "Tasks": ["src/pages/Tasks.tsx", "src/components/tasks/TaskList.tsx"],
  "Workspace": ["src/pages/Workspace.tsx", "src/components/workspace/WorkspaceEditor.tsx"],
};

// Infer likely files from error logs
function inferAffectedFiles(errorLogs: string[]): string[] {
  const files: Set<string> = new Set();
  
  for (const log of errorLogs) {
    // Extract file paths from error messages
    // Pattern 1: "Error at /supabase/functions/generate-blueprint/index.ts:45"
    // Pattern 2: "at Object.<anonymous> (src/hooks/useBlueprint.ts:123:45)"
    // Pattern 3: "/src/components/dashboard/ExecutionDashboard.tsx:89"
    
    // Match paths starting with supabase/ or src/
    const fileMatches = log.match(/(?:\/)?(?:supabase|src)\/[^:\s\)]+/g);
    if (fileMatches) {
      for (const match of fileMatches) {
        // Clean up the path
        const cleanPath = match.startsWith("/") ? match.slice(1) : match;
        files.add(cleanPath);
      }
    }
    
    // Check for function name mappings
    for (const [functionName, filePaths] of Object.entries(FUNCTION_FILE_MAPPINGS)) {
      if (log.toLowerCase().includes(functionName.toLowerCase())) {
        for (const filePath of filePaths) {
          files.add(filePath);
        }
      }
    }
    
    // Extract component names from React error stack traces
    // Pattern: "at ComponentName (webpack...)"
    const componentMatches = log.match(/at\s+([A-Z][a-zA-Z]+)\s+\(/g);
    if (componentMatches) {
      for (const match of componentMatches) {
        const componentName = match.replace(/at\s+/, "").replace(/\s+\($/, "");
        // Check if we have a mapping for this component
        if (FUNCTION_FILE_MAPPINGS[componentName]) {
          for (const filePath of FUNCTION_FILE_MAPPINGS[componentName]) {
            files.add(filePath);
          }
        }
      }
    }
  }
  
  // Remove duplicates and return
  return [...files];
}

// Format file contents for the prompt
function formatCodeContext(fileContents: Record<string, string>): string {
  if (Object.keys(fileContents).length === 0) {
    return "No code files were available for analysis.";
  }
  
  return Object.entries(fileContents)
    .map(([path, content]) => {
      // Truncate very long files to avoid token limits
      const maxLines = 500;
      const lines = content.split("\n");
      const truncated = lines.length > maxLines;
      const displayContent = truncated 
        ? lines.slice(0, maxLines).join("\n") + `\n\n// ... (${lines.length - maxLines} more lines truncated)`
        : content;
      
      return `
===== File: ${path} =====
${displayContent}
===== End of ${path} =====`;
    })
    .join("\n\n");
}

// ============================================
// PROMPT BUILDING
// ============================================

// Build system prompt based on task type
function buildSystemPrompt(taskType: string, context: TaskContext, codeContext: string): string {
  const basePrompt = `You are the Code Architect Agent for TrueBlazer AI.

Tech Stack:
- React + TypeScript + Vite (frontend)
- Supabase (PostgreSQL + Edge Functions + Auth)
- Stripe (payments)
- Anthropic Claude API (via Lovable AI Gateway)
- Tailwind CSS + shadcn/ui components
- TanStack Query for data fetching
- Zustand for state management

Your mission: Analyze bugs and design production-ready fixes.

Input:
Issue: ${context.issue_description}
Error Logs: ${context.error_logs.join('\n')}
Affected Files: ${context.affected_files?.join(', ') || 'Inferred from error logs'}
Severity: ${context.severity}
${context.user_reports ? `User Reports: ${context.user_reports.join('\n')}` : ''}

CODE CONTEXT:
${codeContext}

IMPORTANT: Use the code context above to provide specific, accurate analysis. Reference exact line numbers, function names, and variable names from the actual code.`;

  if (taskType === "analyze_bug") {
    return `${basePrompt}

Your task:
1. Identify the root cause (be specific, reference exact line numbers and code from the context)
2. Explain why it's happening (technical details with code references)
3. Design a fix with step-by-step implementation
4. Generate a complete Lovable prompt that implements the fix
5. Include test cases to verify the fix works
6. Rate your confidence (0-100)

Output format (JSON only, no markdown code blocks):
{
  "root_cause": "Single sentence explaining the core issue with specific code reference",
  "affected_components": ["file1.ts", "file2.tsx"],
  "explanation": "2-3 paragraph technical explanation referencing specific code",
  "fix_plan": {
    "steps": ["step 1 with specific changes", "step 2", "step 3"],
    "files_to_modify": ["exact/file/paths.ts"],
    "new_dependencies": ["npm-package-name or empty array"],
    "database_migrations": ["SQL if needed or empty array"]
  },
  "lovable_prompt": "Complete Lovable.dev prompt that can be copy-pasted to fix the issue. Be detailed, reference specific files and line numbers.",
  "test_cases": ["test instruction 1", "test instruction 2"],
  "confidence": 85,
  "estimated_time": "30 minutes",
  "risk_level": "low"
}`;
  }

  if (taskType === "design_fix") {
    return `${basePrompt}

Your task:
1. Design a comprehensive fix plan using the actual code structure
2. Consider edge cases and potential side effects
3. Generate a detailed Lovable prompt for implementation
4. Estimate time and risk

Output format (JSON only, no markdown code blocks):
{
  "root_cause": "Single sentence explaining the core issue",
  "affected_components": ["file1.ts", "file2.tsx"],
  "explanation": "Detailed technical explanation of the fix approach with code references",
  "fix_plan": {
    "steps": ["detailed step 1 referencing specific code", "detailed step 2", "detailed step 3"],
    "files_to_modify": ["exact/file/paths.ts"],
    "new_dependencies": [],
    "database_migrations": []
  },
  "lovable_prompt": "Complete Lovable.dev prompt with phase-by-phase implementation instructions",
  "test_cases": ["test instruction 1", "test instruction 2"],
  "confidence": 85,
  "estimated_time": "30 minutes",
  "risk_level": "low"
}`;
  }

  if (taskType === "code_review") {
    return `${basePrompt}

Your task:
1. Review the code for correctness based on the actual implementation
2. Identify potential bugs or security issues
3. Suggest improvements
4. Rate the quality of the current implementation

Output format (JSON only, no markdown code blocks):
{
  "root_cause": "Summary of what issues exist in the current code",
  "affected_components": ["file1.ts", "file2.tsx"],
  "explanation": "Review of the code - what's good, what needs improvement",
  "fix_plan": {
    "steps": ["recommended changes with specific code references"],
    "files_to_modify": ["files that need changes"],
    "new_dependencies": [],
    "database_migrations": []
  },
  "lovable_prompt": "Lovable prompt with improvements, referencing specific line numbers and code",
  "test_cases": ["additional tests to add"],
  "confidence": 90,
  "estimated_time": "15 minutes",
  "risk_level": "low"
}`;
  }

  return basePrompt;
}

// Call Claude API
async function callClaudeAPI(systemPrompt: string, retryCount = 0): Promise<AnalysisResult> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", response.status, errorText);
    
    // Retry once on failure
    if (retryCount === 0) {
      console.log("Retrying Claude API call...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callClaudeAPI(systemPrompt, 1);
    }
    
    throw new Error(`Claude API failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  
  if (!content) {
    throw new Error("No content in Claude response");
  }

  // Parse JSON response
  try {
    // Remove potential markdown code blocks
    let jsonStr = content.trim();
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
    if (!result.root_cause || !result.fix_plan || typeof result.confidence !== "number") {
      throw new Error("Missing required fields in response");
    }
    
    // Ensure confidence is within bounds
    result.confidence = Math.max(0, Math.min(100, result.confidence));
    
    // Ensure risk_level is valid
    if (!["low", "medium", "high", "critical"].includes(result.risk_level)) {
      result.risk_level = "medium";
    }
    
    return result;
  } catch (parseError) {
    console.error("JSON parse error:", parseError);
    console.error("Raw content:", content);
    
    // Return partial analysis with flag for human review
    return {
      root_cause: "Unable to parse AI response - requires human review",
      affected_components: [],
      explanation: content,
      fix_plan: {
        steps: ["Review raw AI output below"],
        files_to_modify: [],
        new_dependencies: [],
        database_migrations: [],
      },
      lovable_prompt: "Parse error - see raw explanation for details",
      test_cases: [],
      confidence: 0,
      estimated_time: "Unknown",
      risk_level: "high",
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing or invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("JWT verification failed:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub;

    // Parse request body
    const body: RequestBody = await req.json();
    const { userId, task } = body;

    // Validate request
    if (!userId || !task?.type || !task?.context) {
      return new Response(
        JSON.stringify({ 
          error: "Bad Request - missing required fields",
          required: ["userId", "task.type", "task.context.issue_description", "task.context.error_logs", "task.context.severity"]
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify userId matches authenticated user
    if (userId !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - userId mismatch" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate task type
    if (!["analyze_bug", "design_fix", "code_review"].includes(task.type)) {
      return new Response(
        JSON.stringify({ error: "Bad Request - invalid task type", valid_types: ["analyze_bug", "design_fix", "code_review"] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate context
    const { context } = task;
    if (!context.issue_description || !Array.isArray(context.error_logs) || !context.severity) {
      return new Response(
        JSON.stringify({ error: "Bad Request - missing context fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${task.type} task for user ${userId}`);
    console.log("Issue:", context.issue_description);

    // ============================================
    // FILE READING AND INFERENCE
    // ============================================
    
    // Get affected files - either from context or inferred from error logs
    let affectedFiles = context.affected_files || [];
    let filesWereInferred = false;
    
    if (affectedFiles.length === 0 && context.error_logs.length > 0) {
      affectedFiles = inferAffectedFiles(context.error_logs);
      filesWereInferred = true;
      console.log("Inferred affected files from error logs:", affectedFiles);
    }
    
    // Read the files
    let fileContents: Record<string, string> = {};
    let codeContext = "No code files specified or available.";
    
    if (affectedFiles.length > 0) {
      console.log(`Reading ${affectedFiles.length} code files...`);
      fileContents = await readCodeFiles(affectedFiles);
      codeContext = formatCodeContext(fileContents);
      console.log(`Successfully read ${Object.keys(fileContents).length} files`);
    }

    // Build prompt with code context and call Claude
    const systemPrompt = buildSystemPrompt(task.type, context, codeContext);
    
    let analysisResult: AnalysisResult;
    try {
      analysisResult = await callClaudeAPI(systemPrompt);
    } catch (apiError) {
      console.error("Claude API error:", apiError);
      return new Response(
        JSON.stringify({ 
          error: "AI analysis failed",
          message: apiError instanceof Error ? apiError.message : "Unknown error",
          requires_human_review: true,
          files_attempted: affectedFiles,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine if approval is required
    const requiresApproval = analysisResult.confidence < 80 || analysisResult.risk_level !== "low";
    const approvalStatus = requiresApproval ? "pending" : "approved";

    // Create admin client for logging to agent_decisions
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log decision to agent_decisions table
    const { data: decisionData, error: decisionError } = await adminClient
      .from("agent_decisions")
      .insert({
        user_id: userId,
        agent_name: "code_architect",
        decision_type: `${task.type}_proposed`,
        inputs: {
          ...context,
          files_analyzed: Object.keys(fileContents),
          files_were_inferred: filesWereInferred,
        },
        outputs: analysisResult,
        reasoning: analysisResult.explanation,
        confidence: analysisResult.confidence,
        risk_level: analysisResult.risk_level,
        requires_approval: requiresApproval,
        approved: requiresApproval ? null : true,
        approved_at: requiresApproval ? null : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (decisionError) {
      console.error("Failed to log decision:", decisionError);
      // Continue anyway - logging failure shouldn't block the response
    }

    const decisionId = decisionData?.id || null;

    console.log(`Analysis complete. Confidence: ${analysisResult.confidence}, Requires approval: ${requiresApproval}`);
    console.log(`Files analyzed: ${Object.keys(fileContents).length}, Files inferred: ${filesWereInferred}`);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          root_cause: analysisResult.root_cause,
          affected_components: analysisResult.affected_components,
          explanation: analysisResult.explanation,
          fix_plan: analysisResult.fix_plan,
          test_cases: analysisResult.test_cases,
          confidence: analysisResult.confidence,
          risk_level: analysisResult.risk_level,
        },
        lovable_prompt: analysisResult.lovable_prompt,
        requires_approval: requiresApproval,
        approval_status: approvalStatus,
        decision_id: decisionId,
        estimated_time: analysisResult.estimated_time,
        code_analysis: {
          files_analyzed: Object.keys(fileContents),
          files_were_inferred: filesWereInferred,
          total_files: Object.keys(fileContents).length,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
