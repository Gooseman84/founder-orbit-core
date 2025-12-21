// src/components/ideas/MarketSignalModal.tsx
// Modal for selecting market signal domains and generating ideas
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TrendingUp, Info, Sparkles } from "lucide-react";
import type { MarketSignalDomain } from "@/types/ideaSource";

interface MarketSignalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: { painThemes: string[]; ideas: any[]; signalRunId: string }) => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  core: "bg-primary/20 text-primary border-primary/30",
  high: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-muted text-muted-foreground border-border",
};

export function MarketSignalModal({ open, onClose, onSuccess }: MarketSignalModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [domains, setDomains] = useState<MarketSignalDomain[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      loadDomains();
      setSelectedIds([]);
    }
  }, [open]);

  // Priority rank map for sorting (core first, then high, then medium)
  const PRIORITY_RANK: Record<string, number> = { core: 0, high: 1, medium: 2 };

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("market_signal_domains")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      
      // Sort by priority using rank map (core=0, high=1, medium=2, fallback=9)
      const sorted = (data || []).sort((a, b) => {
        const rankA = PRIORITY_RANK[a.priority] ?? 9;
        const rankB = PRIORITY_RANK[b.priority] ?? 9;
        return rankA - rankB;
      });
      
      setDomains(sorted as unknown as MarketSignalDomain[]);
    } catch (e) {
      console.error("Failed to load domains:", e);
      toast({ title: "Error", description: "Failed to load market domains", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDomain = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((d) => d !== id);
      }
      // Max 2 domains
      if (prev.length >= 2) {
        toast({ title: "Limit reached", description: "You can select up to 2 domains" });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleGenerate = async () => {
    if (!user?.id || selectedIds.length === 0) return;

    setIsGenerating(true);
    try {
      // Security: use invokeAuthedFunction to guarantee JWT is passed
      const { data, error } = await invokeAuthedFunction<{
        painThemes?: string[];
        ideas?: any[];
        signalRunId?: string;
        domainsUsed?: string[];
        error?: string;
        code?: string;
      }>(
        "generate-market-signal-ideas",
        { body: { selectedDomainIds: selectedIds } }
      );

      if (error) throw error;

      // Handle rate limits
      if (data?.code === "rate_limited") {
        toast({ 
          title: "Rate Limited", 
          description: "AI is busy. Try again in a minute.", 
          variant: "destructive" 
        });
        setIsGenerating(false);
        return;
      }

      // Handle payment/credits required
      if (data?.code === "payment_required") {
        toast({ 
          title: "Credits Exhausted", 
          description: "AI credits exhausted. Please add funds.", 
          variant: "destructive" 
        });
        setIsGenerating(false);
        return;
      }

      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        setIsGenerating(false);
        return;
      }

      toast({ 
        title: "Market Signal Ideas Generated!", 
        description: `${data?.ideas?.length || 0} ideas from ${data?.domainsUsed?.join(" + ")}` 
      });
      
      onSuccess({
        painThemes: data?.painThemes || [],
        ideas: data?.ideas || [],
        signalRunId: data?.signalRunId || "",
      });
      onClose();
    } catch (e: any) {
      console.error("Market signal generation failed:", e);
      
      // Handle AuthSessionMissingError specifically
      if (e instanceof AuthSessionMissingError || e?.code === "AUTH_SESSION_MISSING") {
        toast({ 
          title: "Session expired", 
          description: "Please sign in again and retry.", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Generation Failed", 
          description: "Something went wrong generating ideas. Please try again.", 
          variant: "destructive" 
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedDomains = domains.filter((d) => selectedIds.includes(d.id));
  const totalSubreddits = selectedDomains.reduce((acc, d) => acc + (d.subreddits?.length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Generate from Real Market Pain
          </DialogTitle>
          <DialogDescription>
            Select 1-2 market domains to discover business ideas based on inferred pain patterns.
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-muted/50 border-muted">
          <Info className="w-4 h-4" />
          <AlertDescription className="text-sm">
            This uses pattern inference from topic clusters — no scraping, no data collection.
            Ideas are generated based on common problems in these communities.
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {domains.map((domain) => (
              <div
                key={domain.id}
                onClick={() => toggleDomain(domain.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedIds.includes(domain.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.includes(domain.id)}
                    onCheckedChange={() => toggleDomain(domain.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{domain.domain}</span>
                      <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[domain.priority] || ""}`}>
                        {domain.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {domain.subreddits?.length || 0} topic clusters: {domain.subreddits?.slice(0, 3).join(", ")}
                      {(domain.subreddits?.length || 0) > 3 && "..."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{selectedDomains.map(d => d.domain).join(" + ")}</span>
            {" · "}{totalSubreddits} topic clusters
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={selectedIds.length === 0 || isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Ideas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
