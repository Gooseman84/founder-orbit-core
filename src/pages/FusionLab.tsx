import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { Combine, Sparkles, ExternalLink, ArrowLeft, GitMerge, Zap, Info, Lock } from "lucide-react";

interface FusionMetadata {
  source_idea_ids?: string[];
  source_titles?: string[];
  fusion_mode?: string;
  blended_modes?: string[];
  fusion_notes?: string;
}

interface LibraryIdea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  platform: string | null;
  mode: string | null;
  engine_version: string | null;
  virality_potential: number | null;
  leverage_score: number | null;
  automation_density: number | null;
  fusion_metadata: FusionMetadata | null;
}

const getModeLabel = (mode: string | null): string => {
  if (!mode) return "";
  const labels: Record<string, string> = {
    breadth: "Breadth",
    focus: "Focus",
    creator: "Creator",
    automation: "Automation",
    persona: "Persona",
    boundless: "Boundless",
    locker_room: "Locker Room",
    chaos: "Chaos",
    money_printer: "Money Printer",
    memetic: "Memetic",
    fusion: "Fusion",
    variant_chaos: "Variant (Chaos)",
    variant_creator: "Variant (Creator)",
  };
  return labels[mode] || mode.charAt(0).toUpperCase() + mode.slice(1).replace("_", " ");
};

const getModeColor = (mode: string | null): string => {
  if (!mode) return "bg-muted text-muted-foreground";
  if (mode.includes("chaos")) return "bg-red-500/10 text-red-600";
  if (mode.includes("creator")) return "bg-purple-500/10 text-purple-600";
  if (mode.includes("persona")) return "bg-blue-500/10 text-blue-600";
  if (mode.includes("memetic")) return "bg-orange-500/10 text-orange-600";
  if (mode === "fusion") return "bg-primary/10 text-primary";
  if (mode.includes("automation")) return "bg-cyan-500/10 text-cyan-600";
  if (mode.includes("money_printer")) return "bg-green-500/10 text-green-600";
  return "bg-muted text-muted-foreground";
};

const FusionLab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPro, loading: featureLoading } = useFeatureAccess();
  const [libraryIdeas, setLibraryIdeas] = useState<LibraryIdea[]>([]);
  const [fusionHistory, setFusionHistory] = useState<LibraryIdea[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFusing, setIsFusing] = useState(false);
  const [fusedResult, setFusedResult] = useState<LibraryIdea | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Show upgrade modal for free users instead of redirecting
  useEffect(() => {
    if (!featureLoading && !hasPro) {
      setShowUpgradeModal(true);
    }
  }, [hasPro, featureLoading]);

  // Fetch library ideas and fusion history
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        const { data: ideas } = await supabase
          .from("ideas")
          .select("id, title, description, category, platform, mode, engine_version, virality_potential, leverage_score, automation_density, fusion_metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const typedIdeas = (ideas || []) as LibraryIdea[];
        setLibraryIdeas(typedIdeas);

        // Filter fusion history (fused or variant ideas)
        const fusions = typedIdeas.filter(
          (i) => i.mode === "fusion" || i.mode?.startsWith("variant")
        );
        setFusionHistory(fusions);
      } catch (error) {
        console.error("Error fetching fusion lab data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      } else {
        toast({ title: "Maximum 3 ideas", description: "Deselect one to add another.", variant: "destructive" });
      }
      return next;
    });
  };

  const handleFuseIdeas = async () => {
    // Check Pro access first
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }

    if (selectedIds.size < 2) {
      toast({ title: "Select at least 2 ideas", variant: "destructive" });
      return;
    }

    const selectedIdeas = libraryIdeas.filter((i) => selectedIds.has(i.id));
    setIsFusing(true);
    setFusedResult(null);

    try {
      const { data, error } = await invokeAuthedFunction<{ idea?: LibraryIdea }>("fuse-ideas", {
        body: { ideas: selectedIdeas },
      });

      if (error) throw error;

      const newIdea = data?.idea as LibraryIdea;
      if (newIdea) {
        setFusedResult(newIdea);
        setFusionHistory((prev) => [newIdea, ...prev]);
        setLibraryIdeas((prev) => [newIdea, ...prev]);
        setSelectedIds(new Set());
        toast({ title: "Fusion Complete!", description: `"${newIdea.title}" has been created.` });
      }
    } catch (error: any) {
      console.error("Fusion error:", error);
      toast({ title: "Fusion Failed", description: error.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsFusing(false);
    }
  };

  const handleFuseAgain = (ideaId: string) => {
    setSelectedIds(new Set([ideaId]));
    setFusedResult(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/ideas")}
          className="-ml-2 w-fit"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Ideas
        </Button>
        <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2 md:gap-3">
          <Combine className="h-6 w-6 md:h-8 md:w-8 text-primary" />
          Fusion Lab
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Remix your best ideas. Fuse 2–3 at a time and discover new hybrid ventures.
        </p>
      </div>

      {/* Pro Tip */}
      <div className="flex items-start gap-3 p-3 md:p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm">
          <span className="font-medium text-primary">Pro tip:</span>{" "}
          <span className="text-muted-foreground">
            Mix different modes (Chaos + Creator, Persona + Memetic) to discover unexpected hybrids.
          </span>
        </div>
      </div>

      {/* Main Grid: Selection + Result - stacks on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column: Idea Selection */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Select Ideas to Fuse
            </h2>
            <Badge variant="outline">
              {selectedIds.size} / 3 selected
            </Badge>
          </div>

          {libraryIdeas.length < 2 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  You need at least 2 ideas to start fusing.{" "}
                  <Button variant="link" className="p-0" onClick={() => navigate("/ideas")}>
                    Generate some ideas first
                  </Button>
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {libraryIdeas.map((idea) => {
                  const isSelected = selectedIds.has(idea.id);
                  return (
                    <div
                      key={idea.id}
                      onClick={() => handleToggleSelect(idea.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(idea.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{idea.title}</span>
                            {idea.mode && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getModeColor(idea.mode)}`}>
                                {getModeLabel(idea.mode)}
                              </span>
                            )}
                            {idea.engine_version === "v6" && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5" />v6
                              </span>
                            )}
                          </div>
                          {idea.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {idea.description}
                            </p>
                          )}
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            {idea.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {idea.category}
                              </span>
                            )}
                            {idea.platform && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {idea.platform}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={handleFuseIdeas}
                disabled={selectedIds.size < 2 || isFusing}
                className="w-full gap-2"
                size="lg"
              >
                {isFusing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Fusing Ideas...
                  </>
                ) : (
                  <>
                    <GitMerge className="h-4 w-4" />
                    Fuse {selectedIds.size} Selected Ideas
                  </>
                )}
              </Button>
            </>
          )}
        </section>

        {/* Right Column: Fusion Result */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Fusion Result
          </h2>

          {fusedResult ? (
            <Card className="border-primary/50">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{fusedResult.title}</CardTitle>
                    <CardDescription className="mt-1">{fusedResult.description}</CardDescription>
                  </div>
                  <Badge className="bg-primary/10 text-primary shrink-0">New Fusion</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {fusedResult.category && (
                    <Badge variant="outline">{fusedResult.category}</Badge>
                  )}
                  {fusedResult.platform && (
                    <Badge variant="outline">{fusedResult.platform}</Badge>
                  )}
                  {fusedResult.mode && (
                    <Badge className={getModeColor(fusedResult.mode)}>
                      {getModeLabel(fusedResult.mode)}
                    </Badge>
                  )}
                </div>

                {/* V6 Metrics */}
                {(fusedResult.virality_potential || fusedResult.leverage_score || fusedResult.automation_density) && (
                  <div className="flex gap-3 text-sm">
                    {fusedResult.virality_potential != null && (
                      <span className="text-muted-foreground">🔥 Virality: {fusedResult.virality_potential}</span>
                    )}
                    {fusedResult.leverage_score != null && (
                      <span className="text-muted-foreground">⚡ Leverage: {fusedResult.leverage_score}</span>
                    )}
                    {fusedResult.automation_density != null && (
                      <span className="text-muted-foreground">🤖 Automation: {fusedResult.automation_density}</span>
                    )}
                  </div>
                )}

                {/* Lineage */}
                {fusedResult.fusion_metadata?.source_titles && fusedResult.fusion_metadata.source_titles.length > 0 && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1 flex items-center gap-1.5">
                      <GitMerge className="h-3.5 w-3.5" />
                      Lineage
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fusedResult.fusion_metadata.source_titles.join(" + ")} → <span className="text-foreground font-medium">{fusedResult.title}</span>
                    </p>
                    {fusedResult.fusion_metadata.fusion_notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        "{fusedResult.fusion_metadata.fusion_notes}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={() => navigate(`/ideas/${fusedResult.id}`)} className="flex-1 gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Idea
                  </Button>
                  <Button variant="outline" onClick={() => handleFuseAgain(fusedResult.id)} className="flex-1 gap-2">
                    <Combine className="h-4 w-4" />
                    Fuse Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <GitMerge className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">
                  Select 2-3 ideas and click "Fuse" to create a hybrid venture.
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      </div>

      {/* Fusion History */}
      <section className="space-y-4 pt-6 border-t">
        <h2 className="text-2xl font-semibold">Fusion History</h2>
        <p className="text-sm text-muted-foreground">
          Your previously fused and variant ideas. Click to explore or remix.
        </p>

        {fusionHistory.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No fused ideas yet. Try combining some ideas above!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fusionHistory.map((idea) => (
              <Card
                key={idea.id}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => navigate(`/ideas/${idea.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {idea.title}
                    </CardTitle>
                    {idea.mode && (
                      <Badge className={`shrink-0 ${getModeColor(idea.mode)}`}>
                        {getModeLabel(idea.mode)}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {idea.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {idea.category && (
                      <Badge variant="outline" className="text-xs">
                        {idea.category}
                      </Badge>
                    )}
                    {idea.platform && (
                      <Badge variant="outline" className="text-xs">
                        {idea.platform}
                      </Badge>
                    )}
                  </div>

                  {/* Lineage */}
                  {idea.fusion_metadata?.source_titles && idea.fusion_metadata.source_titles.length > 0 && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <GitMerge className="h-3 w-3" />
                      {idea.fusion_metadata.source_titles.slice(0, 2).join(" + ")}
                      {idea.fusion_metadata.source_titles.length > 2 && " +..."}
                    </div>
                  )}

                  {/* V6 Scores */}
                  {idea.virality_potential !== null && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>🔥 {idea.virality_potential}</span>
                      <span>⚡ {idea.leverage_score}</span>
                      <span>🤖 {idea.automation_density}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/ideas/${idea.id}`);
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFuseAgain(idea.id);
                      }}
                    >
                      <Combine className="h-3 w-3" />
                      Remix
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          // Navigate back if user is not Pro
          if (!hasPro) {
            navigate("/ideas");
          }
        }}
        reasonCode="FUSION_REQUIRES_PRO"
      />
    </div>
  );
};

export default FusionLab;