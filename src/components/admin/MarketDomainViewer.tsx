import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketSignalDomain } from "@/types/ideaSource";

// Hidden admin/dev utility - only renders when VITE_DEBUG_MODE=true
export function MarketDomainViewer() {
  const [domains, setDomains] = useState<MarketSignalDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only show in debug mode
  const isDebugMode = import.meta.env.VITE_DEBUG_MODE === "true";

  useEffect(() => {
    if (!isDebugMode) return;

    async function fetchDomains() {
      const { data, error } = await supabase
        .from("market_signal_domains")
        .select("*")
        .order("priority", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setDomains(data as MarketSignalDomain[]);
      }
      setLoading(false);
    }

    fetchDomains();
  }, [isDebugMode]);

  if (!isDebugMode) {
    return null;
  }

  const priorityColors: Record<string, string> = {
    core: "bg-primary text-primary-foreground",
    high: "bg-amber-500 text-white",
    medium: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className="text-yellow-500">🔧</span>
          Market Signal Domains (Debug)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domains found. Seed may have failed.</p>
        ) : (
          <div className="space-y-3">
            {domains.map((domain) => (
              <div key={domain.id} className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{domain.domain}</span>
                  <Badge className={priorityColors[domain.priority] || ""} variant="secondary">
                    {domain.priority}
                  </Badge>
                  {!domain.is_active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      inactive
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {domain.subreddits.map((sub) => (
                    <Badge key={sub} variant="outline" className="text-xs font-mono">
                      r/{sub}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Total: {domains.length} domains • Active: {domains.filter(d => d.is_active).length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
