import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, Sparkles, RefreshCw, Pencil } from "lucide-react";
import { FounderBlueprint } from "@/types/blueprint";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Recommendation {
  title: string;
  description: string;
  priority?: string;
}

interface NorthStarSnapshotProps {
  blueprint: FounderBlueprint;
  onEditSection: (section: string) => void;
  onGenerateMoves: () => void;
}

export const NorthStarSnapshot = ({ 
  blueprint, 
  onEditSection, 
  onGenerateMoves 
}: NorthStarSnapshotProps) => {
  const { user } = useAuth();
  const [generatingMoves, setGeneratingMoves] = useState(false);
  // Get first quarter from focus_quarters if it exists
  const currentQuarterFocus = blueprint.focus_quarters?.[0] as Record<string, unknown> | undefined;

  const handleGenerateMoves = async () => {
    if (!user) return;
    
    const recommendations = blueprint.ai_recommendations as unknown as Recommendation[] | null;
    
    if (!recommendations || recommendations.length === 0) {
      toast({ 
        title: "No recommendations", 
        description: "Refresh your blueprint with AI first to generate recommendations.",
        variant: "destructive" 
      });
      onGenerateMoves();
      return;
    }

    setGeneratingMoves(true);
    try {
      const tasks = recommendations.slice(0, 5).map((rec) => ({
        user_id: user.id,
        type: "blueprint_move",
        title: rec.title,
        description: rec.description,
        xp_reward: 10,
        status: "pending",
      }));

      const { error } = await supabase.from("tasks").insert(tasks);

      if (error) throw error;

      toast({ 
        title: "5 new moves added to your Tasks", 
        description: "Check your Tasks page to get started." 
      });
    } catch (err) {
      console.error("Failed to create tasks:", err);
      toast({ 
        title: "Error", 
        description: "Failed to create tasks from recommendations", 
        variant: "destructive" 
      });
    } finally {
      setGeneratingMoves(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">North Star</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onEditSection("north_star")}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* One-Liner - Big and prominent */}
        <div className="text-center py-4">
          {blueprint.north_star_one_liner ? (
            <p className="text-xl font-semibold text-primary leading-relaxed">
              "{blueprint.north_star_one_liner}"
            </p>
          ) : (
            <p className="text-lg text-muted-foreground/50 italic">
              Your north star one-liner goes here
            </p>
          )}
        </div>

        {/* Validation Stage */}
        <div className="flex items-center justify-center">
          {blueprint.validation_stage ? (
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Stage: {blueprint.validation_stage}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground">
              Stage not set
            </Badge>
          )}
        </div>

        {/* Current Quarter Focus */}
        {currentQuarterFocus && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Current Quarter Focus
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {currentQuarterFocus.title && (
                <p className="font-medium text-sm">{String(currentQuarterFocus.title)}</p>
              )}
              {currentQuarterFocus.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {String(currentQuarterFocus.description)}
                </p>
              )}
              {currentQuarterFocus.goals && Array.isArray(currentQuarterFocus.goals) && (
                <ul className="mt-2 space-y-1">
                  {currentQuarterFocus.goals.map((goal, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="text-primary">•</span>
                      {String(goal)}
                    </li>
                  ))}
                </ul>
              )}
              {!currentQuarterFocus.title && !currentQuarterFocus.description && (
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(currentQuarterFocus, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        {!currentQuarterFocus && (
          <div className="text-center py-3">
            <p className="text-sm text-muted-foreground/50 italic">
              No quarterly focus set
            </p>
          </div>
        )}

        {/* AI Summary */}
        {blueprint.ai_summary && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                AI Summary
              </p>
            </div>
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              {blueprint.ai_summary}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          <Button 
            className="w-full" 
            onClick={() => onEditSection("full_blueprint")}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Blueprint
          </Button>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGenerateMoves}
            disabled={generatingMoves}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${generatingMoves ? "animate-pulse" : ""}`} />
            {generatingMoves ? "Adding moves..." : "Generate Next 5 Moves"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NorthStarSnapshot;
