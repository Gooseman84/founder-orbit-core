import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export async function fetchFrameworks(
  supabase: SupabaseClient,
  options: {
    functions?: string[];
    businessModel?: string;
    stage?: string;
    injectionRole?: "core" | "context" | "conditional" | null;
    maxTokens?: number;
    limit?: number;
  }
): Promise<string> {
  try {
    const { functions: fns, businessModel, injectionRole, maxTokens, limit = 6 } = options;

    let query = supabase
      .from("frameworks")
      .select("title, content, token_estimate, priority")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(limit);

    if (fns?.length) {
      query = query.overlaps("applies_to_functions", [...fns, "all"]);
    }

    if (businessModel) {
      query = query.overlaps("applies_to_models", [businessModel, "all"]);
    }

    if (injectionRole) {
      query = query.eq("injection_role", injectionRole);
    }

    const { data, error } = await query;

    if (error || !data?.length) {
      return "";
    }

    const selected: { title: string; content: string }[] = [];
    let tokenBudget = maxTokens ?? Infinity;

    for (const fw of data) {
      const est = fw.token_estimate ?? 0;
      if (est > tokenBudget) continue;
      selected.push({ title: fw.title, content: fw.content });
      tokenBudget -= est;
    }

    if (!selected.length) return "";

    return selected.map((f) => `### ${f.title}\n${f.content}`).join("\n\n");
  } catch {
    return "";
  }
}
