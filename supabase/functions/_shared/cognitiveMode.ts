// supabase/functions/_shared/cognitiveMode.ts
// Controls the AI's cognitive posture for each function call.

export type CognitiveMode = 'explore' | 'converge' | 'critique' | 'summarize';

const COGNITIVE_MODE_PREAMBLES: Record<CognitiveMode, string> = {
  explore: `## COGNITIVE MODE: EXPLORE
Generate a broad range of possibilities. Divergent thinking is appropriate here. Multiple valid answers are expected and welcome. Avoid converging on a single answer prematurely. Surface options the founder may not have considered.`,

  converge: `## COGNITIVE MODE: CONVERGE
Produce exactly one output. Do not present alternatives or options. The founder needs a decision, not a menu. Be specific, concrete, and time-bound. Vague or hedged outputs are failures in this mode.`,

  critique: `## COGNITIVE MODE: CRITIQUE
Your primary job is to find what's wrong, weak, or missing. Adopt an adversarial but constructive posture. Identify the assumption most likely to fail. Do not validate unless evidence genuinely warrants it. Surface blind spots the founder cannot see from inside their own work.`,

  summarize: `## COGNITIVE MODE: SUMMARIZE
Compress and synthesize only. Do not generate new information or recommendations not present in the input. Your job is to surface the most important signal from existing data. Brevity is accuracy.`,
};

export function getCognitiveModeBlock(mode: CognitiveMode): string {
  return COGNITIVE_MODE_PREAMBLES[mode];
}

export function injectCognitiveMode(systemPrompt: string, mode: CognitiveMode): string {
  const modeBlock = getCognitiveModeBlock(mode);
  // Inject at the very top of the system prompt, before any other content
  return `${modeBlock}\n\n${systemPrompt}`;
}
