/**
 * Generate default AI prompts and linked sections for execution tasks
 * based on task title when these fields aren't already set.
 */

interface VentureContext {
  ventureName: string;
  targetCustomer?: string;
  valueProposition?: string;
}

interface TaskPromptDefaults {
  aiPrompt: string;
  linkedSection: string | null;
}

const TITLE_MAPPINGS: Array<{
  pattern: RegExp;
  linkedSection: string | null;
  promptTemplate: string;
}> = [
  {
    pattern: /mvp\s*feature/i,
    linkedSection: "MVP Features",
    promptTemplate:
      "Help me define the MVP feature set for {ventureName}. My target customer is {targetCustomer} and my core value proposition is {valueProposition}. Suggest 5-8 essential features for launch, explaining why each is critical for validating the business model. Keep features minimal and focused on the core problem.",
  },
  {
    pattern: /customer\s*interview/i,
    linkedSection: null,
    promptTemplate:
      "Help me create a customer interview script for {ventureName}. My target customer is {targetCustomer}. Generate 10-15 open-ended questions that help me validate whether {valueProposition} solves a real problem. Include warm-up questions, core validation questions, and follow-ups.",
  },
  {
    pattern: /competitor|competitive/i,
    linkedSection: "Competitive Landscape",
    promptTemplate:
      "Help me analyze the competitive landscape for {ventureName}. I'm targeting {targetCustomer} with {valueProposition}. Identify key competitors, their strengths/weaknesses, pricing models, and where I can differentiate.",
  },
  {
    pattern: /go.to.market|gtm|launch\s*plan/i,
    linkedSection: "Go-to-Market Strategy",
    promptTemplate:
      "Help me create a go-to-market plan for {ventureName}. My target customer is {targetCustomer}. Outline the first 30 days of launch activities including channels, messaging, and metrics to track.",
  },
  {
    pattern: /success\s*metric|kpi|measure/i,
    linkedSection: "Success Metrics",
    promptTemplate:
      "Help me define measurable success metrics for {ventureName}. My target customer is {targetCustomer} and my value proposition is {valueProposition}. Suggest 3-5 north star metrics for the first 90 days with specific targets.",
  },
  {
    pattern: /pricing|monetiz/i,
    linkedSection: "Pricing Strategy",
    promptTemplate:
      "Help me develop a pricing strategy for {ventureName}. My target customer is {targetCustomer} with {valueProposition}. Analyze pricing models, suggest tiers, and explain the psychology behind each choice.",
  },
  {
    pattern: /landing\s*page|website/i,
    linkedSection: null,
    promptTemplate:
      "Help me outline the landing page for {ventureName}. My target customer is {targetCustomer}. Write compelling headline options, subheadline, feature bullets, social proof section, and CTA copy.",
  },
  {
    pattern: /email|outreach|cold/i,
    linkedSection: null,
    promptTemplate:
      "Help me draft outreach templates for {ventureName}. I'm reaching out to {targetCustomer} about {valueProposition}. Create 3 email variations: cold outreach, warm intro request, and follow-up.",
  },
  {
    pattern: /user\s*persona|ideal\s*customer/i,
    linkedSection: "Target Customer",
    promptTemplate:
      "Help me build detailed user personas for {ventureName}. Based on {targetCustomer}, create 2-3 personas with demographics, pain points, goals, objections, and where they spend time online.",
  },
  {
    pattern: /value\s*prop|unique\s*selling/i,
    linkedSection: "Value Proposition",
    promptTemplate:
      "Help me sharpen the value proposition for {ventureName}. Currently it's: {valueProposition}. Refine this into a clear, compelling statement and test it against common frameworks (Jobs-to-be-Done, Value Proposition Canvas).",
  },
];

function fillTemplate(template: string, ctx: VentureContext): string {
  return template
    .replace(/\{ventureName\}/g, ctx.ventureName || "my venture")
    .replace(/\{targetCustomer\}/g, ctx.targetCustomer || "my target customers")
    .replace(/\{valueProposition\}/g, ctx.valueProposition || "my core value proposition");
}

/**
 * Generate a context-aware AI prompt and linked section for a task.
 * Falls back to a generic prompt when no mapping matches.
 */
export function getTaskPromptDefaults(
  taskTitle: string,
  taskDescription: string,
  ventureContext: VentureContext
): TaskPromptDefaults {
  const titleLower = taskTitle.toLowerCase();

  for (const mapping of TITLE_MAPPINGS) {
    if (mapping.pattern.test(titleLower)) {
      return {
        aiPrompt: fillTemplate(mapping.promptTemplate, ventureContext),
        linkedSection: mapping.linkedSection,
      };
    }
  }

  // Fallback: generic prompt
  return {
    aiPrompt: `I'm working on the task: "${taskTitle}" for my venture ${ventureContext.ventureName}. ${taskDescription ? `Context: ${taskDescription}` : ""} Help me think through this step by step and create a clear deliverable.`,
    linkedSection: null,
  };
}
