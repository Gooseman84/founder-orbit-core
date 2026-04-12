import { useState } from "react";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";

export interface ProblemSource {
  platform: string;
  quote: string;
  url?: string;
}

export interface DiscoveredProblem {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  frequency: "daily" | "weekly" | "monthly" | "occasional";
  sources: ProblemSource[];
  affected_roles: string[];
  existing_workarounds: string[];
  opportunity_signal: string;
}

export interface ProblemDiscoveryResult {
  problems: DiscoveredProblem[];
  domain: string;
  sub_domain: string | null;
  sources: string[];
  founder_context_used: boolean;
}

export function useProblemDiscovery() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProblemDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const discover = async (domain: string, subDomain?: string, targetRoles?: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await invokeAuthedFunction<ProblemDiscoveryResult>(
        "discover-validated-problems",
        {
          body: {
            domain,
            sub_domain: subDomain || undefined,
            target_roles: targetRoles?.length ? targetRoles : undefined,
          },
        }
      );
      if (fnError) throw fnError;
      setResult(data);
      return data;
    } catch (err: any) {
      const msg = err?.message || "Failed to discover problems";
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clear = () => {
    setResult(null);
    setError(null);
  };

  return { discover, isLoading, result, error, clear };
}
