import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embed the prompt template directly
const WORKSPACE_DOC_PROMPT = `---
You are an expert startup copywriter, strategist, and execution coach.

Your job is to help the founder create ONE focused document based on:
- their founder profile
- their chosen idea
- the idea analysis
- the triggering context (feed item or task)
- any notes they have already started

Input JSON example:
{
  "founder_profile": { ... },
  "idea": { ... },
  "analysis": { ... },
  "doc_type": "outline" | "offer" | "script" | "plan" | "brain_dump",
  "title": "string",
  "current_content": "string",
  "trigger_context": {
    "type": "feed" | "task" | "manual",
    "summary": "string"
  }
}

Respond with STRICT JSON ONLY:

{
  "suggested_title": "string",
  "suggested_content": "string",
  "section_suggestions": ["string"]
}

Rules:
- Use plain, punchy language.
- Make content immediately usable.
- If current_content is non-empty, IMPROVE and EXTEND it instead of rewriting from scratch.
- Tailor everything to the specific idea and founder constraints.
---`;

// workspaceEngine utilities embedded
function formatWorkspaceSuggestion(rawJson: any) {
  if (!rawJson || typeof rawJson !== "object") {
    console.error("Invalid workspace suggestion format");
    return {
      suggested_title: "Untitled Document",
      suggested_content: "",
      section_suggestions: [],
    };
  }

  return {
    suggested_title:
      typeof rawJson.suggested_title === "string" && rawJson.suggested_title.trim()
        ? rawJson.suggested_title.trim()
        : "Untitled Document",
    suggested_content:
      typeof rawJson.suggested_content === "string"
        ? rawJson.suggested_content.trim()
        : "",
    section_suggestions: Array.isArray(rawJson.section_suggestions)
      ? rawJson.section_suggestions
          .filter((s: any) => typeof s === "string" && s.trim())
          .map((s: any) => s.trim())
      : [],
  };
}

async function buildWorkspaceInput(supabase: any, userId: string, doc: any) {
  try {
    // Fetch founder profile
    const { data: profile, error: profileError } = await supabase
      .from("founder_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      console.error("No founder profile found for user:", userId);
      return null;
    }

    // Fetch chosen idea
    const { data: idea, error: ideaError } = await supabase
      .from("ideas")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "chosen")
      .maybeSingle();

    if (ideaError) throw ideaError;
    if (!idea) {
      console.error("No chosen idea found for user:", userId);
      return null;
    }

    // Fetch latest idea analysis
    const { data: analysis, error: analysisError } = await supabase
      .from("idea_analysis")
      .select("*")
      .eq("user_id", userId)
      .eq("idea_id", idea.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (analysisError) throw analysisError;
    if (!analysis) {
      console.error("No analysis found for chosen idea:", idea.id);
      return null;
    }

    // Build trigger context based on source_type
    let triggerContext = {
      type: "manual",
      summary: "User started a manual document.",
    };

    if (doc.source_type === "feed" && doc.source_id) {
      const { data: feedItem, error: feedError } = await supabase
        .from("feed_items")
        .select("title, body")
        .eq("id", doc.source_id)
        .maybeSingle();

      if (!feedError && feedItem) {
        triggerContext = {
          type: "feed",
          summary: `${feedItem.title}: ${feedItem.body}`,
        };
      }
    } else if (doc.source_type === "task" && doc.source_id) {
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("title, description")
        .eq("id", doc.source_id)
        .maybeSingle();

      if (!taskError && task) {
        triggerContext = {
          type: "task",
          summary: `${task.title}: ${task.description || ""}`,
        };
      }
    }

    return {
      founder_profile: profile,
      idea: idea,
      analysis: analysis,
      doc_type: doc.doc_type || "brain_dump",
      title: doc.title,
      current_content: doc.content || "",
      trigger_context: triggerContext,
    };
  } catch (error) {
    console.error("Error building workspace input:", error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId: bodyUserId, documentId } = await req.json();

    // Resolve userId (prefer from body, else from auth header)
    let userId = bodyUserId;
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        userId = user?.id;
      }
    }

    if (!userId) {
      console.error('No userId provided');
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documentId) {
      console.error('No documentId provided');
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolved userId:', userId, 'documentId:', documentId);

    // Use service-role client to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Load workspace document
    const { data: document, error: docError } = await supabase
      .from('workspace_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (docError) {
      console.error('Error loading document:', docError);
      throw docError;
    }

    if (!document) {
      console.error('Document not found:', documentId);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Loaded document:', document.title);

    // Build LLM input
    const input = await buildWorkspaceInput(supabase, userId, document);
    if (!input) {
      console.error('Failed to build workspace input');
      return new Response(
        JSON.stringify({ error: 'Failed to build input data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Built input for doc_type:', input.doc_type);

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
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
          { role: 'system', content: WORKSPACE_DOC_PROMPT },
          { role: 'user', content: JSON.stringify(input) }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_workspace_suggestion',
            description: 'Generate workspace document suggestions',
            parameters: {
              type: 'object',
              properties: {
                suggested_title: { type: 'string' },
                suggested_content: { type: 'string' },
                section_suggestions: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['suggested_title', 'suggested_content', 'section_suggestions'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_workspace_suggestion' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('Received AI response');

    // Extract tool call arguments
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in AI response');
      throw new Error('Invalid AI response format');
    }

    const rawJson = JSON.parse(toolCall.function.arguments);
    const suggestion = formatWorkspaceSuggestion(rawJson);

    console.log('Formatted suggestion, title:', suggestion.suggested_title);

    // Update workspace document
    const { error: updateError } = await supabase
      .from('workspace_documents')
      .update({
        title: suggestion.suggested_title,
        ai_suggestions: suggestion.suggested_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating document:', updateError);
      throw updateError;
    }

    console.log('Document updated successfully');

    return new Response(
      JSON.stringify({
        documentId,
        suggested_title: suggestion.suggested_title,
        suggested_content: suggestion.suggested_content,
        section_suggestions: suggestion.section_suggestions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-workspace-doc:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
