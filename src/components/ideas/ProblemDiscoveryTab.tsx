import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProblemDiscovery, type DiscoveredProblem } from "@/hooks/useProblemDiscovery";
import { Search, AlertTriangle, TrendingUp, Users, Wrench, Quote, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProblemDiscoveryTabProps {
  onGenerateFromProblem: (problem: DiscoveredProblem) => void;
  selectedProblems: string[];
  onToggleProblem: (problemId: string) => void;
}

const severityConfig = {
  critical: { color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", label: "Critical" },
  high: { color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30", label: "High" },
  medium: { color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30", label: "Medium" },
  low: { color: "bg-muted text-muted-foreground border-border", label: "Low" },
};

const frequencyLabels = {
  daily: "Daily pain",
  weekly: "Weekly issue",
  monthly: "Monthly frustration",
  occasional: "Occasional annoyance",
};

export function ProblemDiscoveryTab({ onGenerateFromProblem, selectedProblems, onToggleProblem }: ProblemDiscoveryTabProps) {
  const { discover, isLoading, result, error } = useProblemDiscovery();
  const { toast } = useToast();
  const [domain, setDomain] = useState("");
  const [subDomain, setSubDomain] = useState("");

  const handleDiscover = async () => {
    if (!domain.trim()) {
      toast({ title: "Enter an industry", description: "Tell us which industry to search for problems in.", variant: "destructive" });
      return;
    }
    try {
      await discover(domain.trim(), subDomain.trim() || undefined);
    } catch {
      toast({ title: "Discovery Failed", description: error || "Could not search for problems. Try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Discover Real Problems
          </CardTitle>
          <p className="text-sm text-muted-foreground font-light">
            Search Reddit, G2, forums, and social media for real complaints in your industry. Find problems worth solving.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Industry (e.g. Real Estate, Healthcare, Logistics)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
            <Input
              placeholder="Sub-sector (optional)"
              value={subDomain}
              onChange={(e) => setSubDomain(e.target.value)}
              className="flex-1 sm:max-w-[200px]"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
            <Button onClick={handleDiscover} disabled={isLoading || !domain.trim()} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isLoading ? "Searching..." : "Find Problems"}
            </Button>
          </div>
          {result?.founder_context_used && (
            <p className="text-xs text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Results personalized with your interview insights
            </p>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <div className="text-center">
            <p className="font-medium">Searching for real problems...</p>
            <p className="text-sm text-muted-foreground mt-1">Scanning Reddit, G2, forums, and social media</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">
                {result.problems.length} Problems Found in {result.domain}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedProblems.length > 0
                  ? `${selectedProblems.length} selected — click "Generate Ideas" to create solutions`
                  : "Select problems to generate targeted ideas"}
              </p>
            </div>
            {selectedProblems.length > 0 && (
              <Button
                onClick={() => {
                  const selected = result.problems.filter((p) => selectedProblems.includes(p.id));
                  selected.forEach((p) => onGenerateFromProblem(p));
                }}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate Ideas ({selectedProblems.length})
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {result.problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                isSelected={selectedProblems.includes(problem.id)}
                onToggle={() => onToggleProblem(problem.id)}
                onGenerate={() => onGenerateFromProblem(problem)}
              />
            ))}
          </div>

          {result.sources.length > 0 && (
            <p className="text-xs text-muted-foreground pt-2">
              Sources: {result.sources.length} citations from live web research
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Find Problems Worth Solving</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Instead of generating ideas from imagination, start with real problems people are complaining about online.
              Enter your industry above to discover validated pain points.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ProblemCard({
  problem,
  isSelected,
  onToggle,
  onGenerate,
}: {
  problem: DiscoveredProblem;
  isSelected: boolean;
  onToggle: () => void;
  onGenerate: () => void;
}) {
  const sev = severityConfig[problem.severity];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "hover:border-primary/20"
      }`}
      onClick={onToggle}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className={sev.color}>{sev.label}</Badge>
              <span className="text-xs text-muted-foreground">{frequencyLabels[problem.frequency]}</span>
              {isSelected && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </div>
            <h4 className="font-semibold text-sm leading-snug">{problem.title}</h4>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); onGenerate(); }}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Solve
          </Button>
        </div>

        <p className="text-sm text-muted-foreground font-light">{problem.description}</p>

        {/* Quick info row */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {problem.affected_roles.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" /> {problem.affected_roles.slice(0, 3).join(", ")}
            </span>
          )}
          {problem.sources.length > 0 && (
            <span className="flex items-center gap-1">
              <Quote className="w-3 h-3" /> {problem.sources.length} source{problem.sources.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Expandable details */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            {problem.sources.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><Quote className="w-3 h-3" /> Real Quotes</p>
                {problem.sources.map((s, i) => (
                  <div key={i} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-1">
                    <span className="font-medium text-foreground">{s.platform}:</span> "{s.quote}"
                  </div>
                ))}
              </div>
            )}
            {problem.existing_workarounds.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> Current Workarounds</p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                  {problem.existing_workarounds.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {problem.opportunity_signal && (
              <div>
                <p className="text-xs font-medium mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Opportunity</p>
                <p className="text-xs text-muted-foreground">{problem.opportunity_signal}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? "Show less" : "Show details"}
        </button>
      </CardContent>
    </Card>
  );
}
