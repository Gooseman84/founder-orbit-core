// supabase/functions/discover-validated-problems/index.ts
// Discovers real, sourced problems in a founder's domain using Perplexity API

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveredProblem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  frequency: "daily" | "weekly" | "monthly" | "occasional";
  sources: { platform: string; quote: string; url?: string }[];
  affected_roles: string[];
  existing_workarounds: string[];
  opportunity_signal: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");

    if (!PERPLEXITY_API_KEY) {
      return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const token = authHeader.slice(7).trim();
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { domain, sub_domain, target_roles } = body;

    if (!domain) {
      return new Response(JSON.stringify({ error: "domain is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch founder's interview context for richer domain understanding
    const { data: interviewData } = await supabaseService
      .from("founder_interviews")
      .select("context_summary")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ctx = interviewData?.context_summary as any;
    const insiderKnowledge = ctx?.extractedInsights?.insiderKnowledge || ctx?.domainExpertise?.specificKnowledge || [];
    const founderSummary = ctx?.founderSummary || "";

    const subDomainClause = sub_domain ? ` specifically in the ${sub_domain} sub-sector` : "";
    const rolesClause = target_roles?.length ? ` affecting ${target_roles.join(", ")}` : "";
    const insiderClause = insiderKnowledge.length
      ? `\n\nThe founder has insider knowledge in: ${insiderKnowledge.slice(0, 5).join("; ")}. Prioritize problems where this expertise is relevant.`
      : "";

    // Run two parallel Perplexity searches for breadth
    const [complaintsRes, trendsRes] = await Promise.all([
      // Search 1: Active complaints and frustrations
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "You are a market research analyst specializing in finding real, unsolved problems in specific industries. You search Reddit, industry forums, G2, Capterra, ProductHunt, Hacker News, and social media for genuine complaints and frustrations. Return only verifiable signals with real quotes.",
            },
            {
              role: "user",
              content: `Find 8-10 real, specific problems that people are actively complaining about in the ${domain} industry${subDomainClause}${rolesClause}.${insiderClause}

Search for:
1. Reddit threads where people describe frustrations with current tools/processes
2. G2/Capterra negative reviews highlighting gaps
3. Forum posts asking "is there a tool that does X?"
4. Social media complaints about workflows, costs, or inefficiencies

For each problem, provide:
- A clear, specific problem title (not generic)
- 2-3 sentence description of the pain
- Severity (critical/high/medium/low based on frequency and emotional intensity)
- How often people encounter it (daily/weekly/monthly/occasional)
- 1-3 real quotes from sources
- Who is affected (job titles/roles)
- What workarounds people currently use

Return JSON:
{
  "problems": [
    {
      "title": "specific problem title",
      "description": "clear description of the pain",
      "severity": "critical|high|medium|low",
      "frequency": "daily|weekly|monthly|occasional",
      "sources": [{"platform": "r/subreddit or G2", "quote": "actual quote"}],
      "affected_roles": ["role1", "role2"],
      "existing_workarounds": ["workaround1"],
      "opportunity_signal": "why this is a business opportunity"
    }
  ]
}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 3000,
          return_citations: true,
        }),
      }),

      // Search 2: Emerging trends and underserved needs
      fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "You are a trend analyst finding emerging, underserved problems in specific industries. Focus on problems that are growing worse, newly emerging, or being ignored by incumbents.",
            },
            {
              role: "user",
              content: `Find 5-7 emerging or underserved problems in the ${domain} industry${subDomainClause} that are growing worse or newly appearing.${insiderClause}

Focus on:
1. Problems created by recent industry changes, regulations, or technology shifts
2. Pain points that existing tools ignore or handle poorly
3. Issues where people are spending excessive time on manual workarounds
4. Complaints that have increased in the last 6-12 months

Return JSON:
{
  "problems": [
    {
      "title": "specific problem title",
      "description": "clear description",
      "severity": "critical|high|medium|low",
      "frequency": "daily|weekly|monthly|occasional",
      "sources": [{"platform": "source", "quote": "quote"}],
      "affected_roles": ["role1"],
      "existing_workarounds": ["workaround1"],
      "opportunity_signal": "why this is growing"
    }
  ]
}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 2500,
          return_citations: true,
        }),
      }),
    ]);

    if (!complaintsRes.ok || !trendsRes.ok) {
      const errText = !complaintsRes.ok ? await complaintsRes.text() : await trendsRes.text();
      console.error("[discover-validated-problems] Perplexity error:", errText);
      return new Response(JSON.stringify({ error: "Market research API error", details: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [complaintsData, trendsData] = await Promise.all([
      complaintsRes.json(),
      trendsRes.json(),
    ]);

    const citations = [
      ...(complaintsData.citations || []),
      ...(trendsData.citations || []),
    ];

    // Parse responses
    const parseProblems = (data: any): any[] => {
      const content = data.choices?.[0]?.message?.content || "{}";
      try {
        const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = fenceMatch ? fenceMatch[1].trim() : content.match(/\{[\s\S]*\}/)?.[0] || "{}";
        const parsed = JSON.parse(jsonStr);
        return parsed.problems || [];
      } catch {
        console.error("[discover-validated-problems] Parse error for:", content.slice(0, 200));
        return [];
      }
    };

    const complaintProblems = parseProblems(complaintsData);
    const trendProblems = parseProblems(trendsData);

    // Merge and deduplicate by title similarity
    const allProblems = [...complaintProblems, ...trendProblems];
    const seen = new Set<string>();
    const uniqueProblems: DiscoveredProblem[] = [];

    for (const p of allProblems) {
      const key = p.title?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      uniqueProblems.push({
        id: crypto.randomUUID(),
        title: p.title || "Untitled problem",
        description: p.description || "",
        severity: ["critical", "high", "medium", "low"].includes(p.severity) ? p.severity : "medium",
        frequency: ["daily", "weekly", "monthly", "occasional"].includes(p.frequency) ? p.frequency : "occasional",
        sources: Array.isArray(p.sources) ? p.sources.slice(0, 3) : [],
        affected_roles: Array.isArray(p.affected_roles) ? p.affected_roles : [],
        existing_workarounds: Array.isArray(p.existing_workarounds) ? p.existing_workarounds : [],
        opportunity_signal: p.opportunity_signal || "",
      });
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    uniqueProblems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    console.log(`[discover-validated-problems] Found ${uniqueProblems.length} unique problems in ${domain}`);

    return new Response(
      JSON.stringify({
        problems: uniqueProblems.slice(0, 15),
        domain,
        sub_domain: sub_domain || null,
        sources: [...new Set(citations)].slice(0, 15),
        founder_context_used: !!insiderKnowledge.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[discover-validated-problems] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
