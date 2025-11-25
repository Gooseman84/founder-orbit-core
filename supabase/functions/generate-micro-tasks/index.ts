import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded prompt from src/prompts/generateMicroTasks.txt
const TASK_GENERATION_PROMPT = `You are an elite execution strategist. Your job is to turn the founder's profile, chosen idea, and idea analysis into actionable MICRO TASKS and FOUNDER QUESTS that move them forward.

Micro Tasks:
- 2–10 minutes
- Simple, actionable, low friction

Founder Quests:
- 20–60 minutes
- Higher leverage
- Strategy, positioning, research, or execution

Input JSON includes:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... }
}

Output STRICT JSON ONLY:

{
  "tasks": [
    {
      "type": "micro" | "quest",
      "title": "string",
      "description": "string",
      "xp_reward": number,
      "metadata": { ... }
    }
  ]
}

Rules:
- No fluff.
- Keep tasks extremely concrete.
- Use simple language.
- Suggest only tasks aligned with the founder's constraints.
- Always return valid JSON.`;

// Build task input (inlined from tasksEngine)
async function buildTaskInput(supabaseClient: any, userId: string) {
  console.log('Building task input for userId:', userId);

  // Fetch founder profile
  const { data: profile, error: profileError } = await supabaseClient
    .from("founder_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching founder profile:", profileError);
    throw new Error("Failed to fetch founder profile");
  }

  if (!profile) {
    throw new Error("No founder profile found. Please complete onboarding first.");
  }

  // Fetch chosen idea
  const { data: idea, error: ideaError } = await supabaseClient
    .from("ideas")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "chosen")
    .maybeSingle();

  if (ideaError) {
    console.error("Error fetching chosen idea:", ideaError);
    throw new Error("Failed to fetch chosen idea");
  }

  if (!idea) {
    throw new Error("No chosen idea found. Please choose an idea first.");
  }

  // Fetch latest analysis for the chosen idea
  const { data: analysis, error: analysisError } = await supabaseClient
    .from("idea_analysis")
    .select("*")
    .eq("user_id", userId)
    .eq("idea_id", idea.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (analysisError) {
    console.error("Error fetching idea analysis:", analysisError);
    throw new Error("Failed to fetch idea analysis");
  }

  if (!analysis) {
    throw new Error("No analysis found for chosen idea. Please analyze the idea first.");
  }

  return {
    founder_profile: profile,
    idea: idea,
    analysis: analysis,
  };
}

// Format tasks (inlined from tasksEngine)
function formatTasks(rawTasks: any[], userId: string, ideaId: string) {
  if (!Array.isArray(rawTasks)) {
    throw new Error("Tasks must be an array");
  }

  return rawTasks.map((task: any, index: number) => {
    // Validate required fields
    if (!task.title || typeof task.title !== "string") {
      throw new Error(`Task at index ${index} is missing a valid title`);
    }

    // Enforce type: must be "micro" or "quest", default to "micro"
    let type: string = "micro";
    if (task.type === "quest" || task.type === "micro") {
      type = task.type;
    }

    // Apply defaults
    const xp_reward = typeof task.xp_reward === "number" && task.xp_reward > 0
      ? task.xp_reward
      : 10;

    const description = typeof task.description === "string" 
      ? task.description 
      : "";

    const metadata = typeof task.metadata === "object" && task.metadata !== null
      ? task.metadata
      : {};

    return {
      user_id: userId,
      idea_id: ideaId,
      type,
      title: task.title.trim(),
      description: description.trim(),
      xp_reward,
      metadata,
      status: 'pending',
    };
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    let userId = body.userId;

    // If no userId in body, try to get from auth
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const anonClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );
        const { data: { user } } = await anonClient.auth.getUser();
        userId = user?.id;
      }
    }

    if (!userId) {
      console.error('No userId provided in body or auth');
      return new Response(
        JSON.stringify({ error: 'userId is required in request body or auth header' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolved userId:', userId);

    // Create service role client to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build task input using tasksEngine logic
    const taskInput = await buildTaskInput(supabaseClient, userId);

    // Call Lovable AI with tool calling for structured output
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: TASK_GENERATION_PROMPT },
          { role: 'user', content: JSON.stringify(taskInput) }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_tasks",
              description: "Generate 3-5 actionable micro-tasks and quests for the founder",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["micro", "quest"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        xp_reward: { type: "number" },
                        metadata: { type: "object" }
                      },
                      required: ["type", "title", "description", "xp_reward"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["tasks"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_tasks" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();

    // Extract structured output from tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call found in response:', aiData);
      return new Response(
        JSON.stringify({ error: 'AI did not return structured output' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let parsedTasks;
    try {
      parsedTasks = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response', details: String(parseError) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parsedTasks.tasks || !Array.isArray(parsedTasks.tasks)) {
      console.error('Invalid tasks structure:', parsedTasks);
      return new Response(
        JSON.stringify({ error: 'Invalid tasks structure in AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Number of tasks generated:', parsedTasks.tasks.length);

    // Format tasks using tasksEngine logic
    const formattedTasks = formatTasks(parsedTasks.tasks, userId, taskInput.idea.id);

    // Insert tasks into database
    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(formattedTasks)
      .select();

    if (insertError) {
      console.error('Task insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert tasks', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully created tasks:', insertedTasks?.length);

    return new Response(
      JSON.stringify({ tasks: insertedTasks }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-micro-tasks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});