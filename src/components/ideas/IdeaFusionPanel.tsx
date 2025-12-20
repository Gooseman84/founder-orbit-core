import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Combine, Sparkles, X, ExternalLink, Library } from "lucide-react";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import type { BusinessIdeaV6 } from "@/types/businessIdea";

interface IdeaFusionPanelProps {
  ideas: any[];
  sessionIdeas?: BusinessIdeaV6[];
  onFusionComplete?: (fusedIdea: any) => void;
  showSessionGroup?: boolean;
}

export const IdeaFusionPanel = ({ 
  ideas, 
  sessionIdeas = [],
  onFusionComplete,
  showSessionGroup = false 
}: IdeaFusionPanelProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isFusing, setIsFusing] = useState(false);
  const [fusedIdea, setFusedIdea] = useState<any>(null);

  const toggleSelection = (ideaId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
      } else if (next.size < 3) {
        next.add(ideaId);
      } else {
        toast({
          title: "Maximum 3 ideas",
          description: "You can only fuse 2-3 ideas at a time.",
          variant: "destructive",
        });
      }
      return next;
    });
  };

  const handleFuse = async () => {
    if (!user?.id) return;
    if (selectedIds.size < 2) {
      toast({
        title: "Select at least 2 ideas",
        description: "You need 2-3 ideas to fuse together.",
        variant: "destructive",
      });
      return;
    }

    // Collect selected ideas from both library and session
    const allIdeas = [...ideas, ...sessionIdeas.filter(si => !ideas.some(i => i.id === si.id))];
    const selectedIdeas = allIdeas.filter((i) => selectedIds.has(i.id));
    setIsFusing(true);

    try {
      const { data, error } = await invokeAuthedFunction<{ idea: any }>("fuse-ideas", {
        body: {
          ideas: selectedIdeas,
        },
      });

      if (error) throw error;

      const newFusedIdea = data?.idea;
      if (newFusedIdea) {
        setFusedIdea(newFusedIdea);
        onFusionComplete?.(newFusedIdea);
        toast({
          title: "Ideas Fused!",
          description: `Created: "${newFusedIdea.title}" — saved to Library`,
        });
      }
    } catch (error: any) {
      console.error("Fusion error:", error);
      toast({
        title: "Fusion Failed",
        description: error.message || "Could not fuse ideas. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsFusing(false);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setFusedIdea(null);
  };

  const handleOpenFusedIdea = () => {
    if (fusedIdea?.id) {
      navigate(`/ideas/${fusedIdea.id}`);
    }
  };

  // Filter out duplicates between library and session
  const libraryIdeas = ideas.filter(i => !sessionIdeas.some(si => si.id === i.id));
  const displaySessionIdeas = sessionIdeas;

  const totalIdeas = libraryIdeas.length + displaySessionIdeas.length;
  if (totalIdeas < 2) {
    return null;
  }

  const renderIdeaCard = (idea: any, isSession = false) => (
    <div
      key={idea.id}
      className={`p-3 border rounded-lg cursor-pointer transition-all ${
        selectedIds.has(idea.id)
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={() => toggleSelection(idea.id)}
    >
      <div className="flex items-start gap-2">
        <Checkbox
          checked={selectedIds.has(idea.id)}
          onCheckedChange={() => toggleSelection(idea.id)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{idea.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {idea.description || idea.oneLiner || idea.business_model_type}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {idea.category && (
              <Badge variant="outline" className="text-xs">
                {idea.category}
              </Badge>
            )}
            {isSession && (
              <Badge variant="secondary" className="text-xs">
                Session
              </Badge>
            )}
            {idea.mode === "fusion" && (
              <Badge className="text-xs">Fused</Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="border-dashed border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Combine className="h-5 w-5 text-primary" />
          Idea Fusion Engine
        </CardTitle>
        <CardDescription>
          Select 2-3 ideas to fuse into a new hybrid venture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selection UI - with optional grouping */}
        {showSessionGroup && displaySessionIdeas.length > 0 && (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Session v6 Ideas ({displaySessionIdeas.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displaySessionIdeas.slice(0, 6).map((idea) => renderIdeaCard(idea, true))}
              </div>
            </div>
            
            {libraryIdeas.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Library className="h-4 w-4 text-muted-foreground" />
                  Library Ideas ({libraryIdeas.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {libraryIdeas.slice(0, 6).map((idea) => renderIdeaCard(idea))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Non-grouped display */}
        {!showSessionGroup && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ideas.slice(0, 9).map((idea) => renderIdeaCard(idea))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} of 3 selected
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
            <Button
              onClick={handleFuse}
              disabled={selectedIds.size < 2 || isFusing}
              className="gap-2"
            >
              {isFusing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Fusing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Fuse Ideas
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Fused result */}
        {fusedIdea && (
          <div className="mt-4 p-4 border border-primary/50 rounded-lg bg-primary/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Badge className="mb-2">Fused Idea</Badge>
                <h4 className="font-bold text-lg">{fusedIdea.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {fusedIdea.description}
                </p>
                {fusedIdea.fusion_notes && (
                  <p className="text-xs text-primary mt-2 italic">
                    "{fusedIdea.fusion_notes}"
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {fusedIdea.category && (
                <Badge variant="secondary">{fusedIdea.category}</Badge>
              )}
              {fusedIdea.platform && (
                <Badge variant="outline">{fusedIdea.platform}</Badge>
              )}
              {fusedIdea.virality_potential !== undefined && (
                <Badge variant="outline">🔥 {fusedIdea.virality_potential}</Badge>
              )}
              {fusedIdea.leverage_score !== undefined && (
                <Badge variant="outline">⚡ {fusedIdea.leverage_score}</Badge>
              )}
            </div>
            
            {/* Action buttons for fused idea */}
            <div className="flex gap-2 mt-4">
              <Button onClick={handleOpenFusedIdea} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Fused Idea
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
