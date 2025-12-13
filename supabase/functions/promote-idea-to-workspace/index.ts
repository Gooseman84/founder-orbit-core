import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BusinessIdea {
  id: string;
  title: string;
  oneLiner: string;
  description: string;
  problemStatement: string;
  targetCustomer: string;
  revenueModel: string;
  mvpApproach: string;
  goToMarket: string;
  competitiveAdvantage: string;
  financialTrajectory: {
    month3: string;
    month6: string;
    month12: string;
    mrrCeiling: string;
  };
  requiredToolsSkills: string;
  risksMitigation: string;
  whyItFitsFounder: string;
  firstSteps: string[];
  [key: string]: any;
}

function generateBlueprintMarkdown(idea: BusinessIdea): string {
  const sections = [
    `# ${idea.title}`,
    ``,
    `> ${idea.oneLiner}`,
    ``,
    `## Overview`,
    idea.description,
    ``,
    `## Problem Statement`,
    idea.problemStatement,
    ``,
    `## Target Customer`,
    idea.targetCustomer,
    ``,
    `## Revenue Model`,
    idea.revenueModel,
    ``,
    `## MVP Approach`,
    idea.mvpApproach,
    ``,
    `## Go-to-Market Strategy`,
    idea.goToMarket,
    ``,
    `## Competitive Advantage`,
    idea.competitiveAdvantage,
    ``,
    `## Financial Trajectory`,
    `- **Month 3:** ${idea.financialTrajectory?.month3 || "TBD"}`,
    `- **Month 6:** ${idea.financialTrajectory?.month6 || "TBD"}`,
    `- **Month 12:** ${idea.financialTrajectory?.month12 || "TBD"}`,
    `- **MRR Ceiling:** ${idea.financialTrajectory?.mrrCeiling || "TBD"}`,
    ``,
    `## Required Tools & Skills`,
    idea.requiredToolsSkills,
    ``,
    `## Risks & Mitigation`,
    idea.risksMitigation,
    ``,
    `## Why This Fits You`,
    idea.whyItFitsFounder,
    ``,
    `## First Steps`,
    ...(idea.firstSteps || []).map((step, i) => `${i + 1}. ${step}`),
  ];

  return sections.join("\n");
}

function generateStarterTasks(idea: BusinessIdea): Array<{ title: string; description: string; category: string; xp_reward: number }> {
  const tasks: Array<{ title: string; description: string; category: string; xp_reward: number }> = [];

  // Use firstSteps if available (up to 5)
  if (idea.firstSteps && idea.firstSteps.length > 0) {
    idea.firstSteps.slice(0, 5).forEach((step, i) => {
      tasks.push({
        title: step,
        description: `Step ${i + 1} from your idea blueprint for "${idea.title}"`,
        category: "validation",
        xp_reward: 15,
      });
    });
  }

  // Add default starter tasks if we have fewer than 3
  if (tasks.length < 3) {
    const defaults = [
      {
        title: `Validate problem with 5 interviews`,
        description: `Talk to potential customers about: ${idea.problemStatement?.slice(0, 100)}...`,
        category: "validation",
        xp_reward: 25,
      },
      {
        title: `Draft landing page copy`,
        description: `Create compelling copy for ${idea.title} targeting ${idea.targetCustomer}`,
        category: "offer",
        xp_reward: 20,
      },
      {
        title: `Map out MVP features`,
        description: `Based on: ${idea.mvpApproach?.slice(0, 100)}...`,
        category: "planning",
        xp_reward: 15,
      },
    ];

    defaults.slice(0, 3 - tasks.length).forEach((t) => tasks.push(t));
  }

  return tasks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { idea, createTasks = true, userId } = await req.json();

    if (!userId) {
      console.error("promote-idea-to-workspace: missing userId");
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!idea || !idea.id || !idea.title) {
      return new Response(JSON.stringify({ error: "Invalid idea object" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Creating workspace blueprint for idea: ${idea.title} for user: ${userId}`);

    // Generate markdown content
    const markdownContent = generateBlueprintMarkdown(idea);

    // Create the workspace document
    const { data: doc, error: docError } = await supabase
      .from("workspace_documents")
      .insert({
        user_id: userId,
        doc_type: "idea_blueprint",
        title: `Blueprint: ${idea.title}`,
        content: markdownContent,
        source_type: "idea_promotion",
        metadata: { idea_id: idea.id, idea_json: idea },
        status: "draft",
      })
      .select("id")
      .single();

    if (docError) {
      console.error("Error creating document:", docError);
      throw docError;
    }

    console.log(`Created document: ${doc.id}`);

    // Create starter tasks if requested
    let taskIds: string[] = [];
    if (createTasks) {
      const starterTasks = generateStarterTasks(idea);
      const tasksToInsert = starterTasks.map((t) => ({
        user_id: userId,
        title: t.title,
        description: t.description,
        category: t.category,
        xp_reward: t.xp_reward,
        status: "pending",
        type: "micro",
        workspace_document_id: doc.id,
        metadata: { source: "idea_promotion", idea_id: idea.id },
      }));

      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .insert(tasksToInsert)
        .select("id");

      if (tasksError) {
        console.error("Error creating tasks:", tasksError);
        // Don't fail the whole operation if tasks fail
      } else {
        taskIds = tasks?.map((t) => t.id) || [];
        console.log(`Created ${taskIds.length} starter tasks`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: doc.id,
        taskIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in promote-idea-to-workspace:", error);
    const errMsg = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
