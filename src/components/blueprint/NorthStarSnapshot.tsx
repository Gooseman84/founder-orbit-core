import { useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
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
  onGenerateMoves,
}: NorthStarSnapshotProps) => {
  const { user } = useAuth();
  const [generatingMoves, setGeneratingMoves] = useState(false);

  const currentQuarterFocus = blueprint.focus_quarters?.[0] as Record<string, unknown> | undefined;

  const handleGenerateMoves = async () => {
    if (!user) return;
    const recommendations = blueprint.ai_recommendations as unknown as Recommendation[] | null;
    if (!recommendations || recommendations.length === 0) {
      toast({
        title: "No recommendations",
        description: "Refresh your blueprint with AI first to generate recommendations.",
        variant: "destructive",
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
      toast({ title: "5 new moves added to your Tasks", description: "Check your Tasks page to get started." });
    } catch (err) {
      console.error("Failed to create tasks:", err);
      toast({ title: "Error", description: "Failed to create tasks from recommendations", variant: "destructive" });
    } finally {
      setGeneratingMoves(false);
    }
  };

  return (
    <div className="border border-border bg-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <span className="label-mono-gold">NORTH STAR</span>
        <button
          onClick={() => onEditSection("north_star")}
          className="label-mono hover:text-foreground transition-colors"
        >
          EDIT
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* One-Liner */}
        {blueprint.north_star_one_liner ? (
          <div className="relative border-l-4 border-primary pl-6 py-2">
            <span className="absolute -top-3 -left-2 font-display text-[3rem] text-primary/30 leading-none pointer-events-none select-none">"</span>
            <p className="font-display italic text-[1.3rem] text-foreground leading-[1.5]">
              {blueprint.north_star_one_liner}
            </p>
          </div>
        ) : (
          <p className="text-sm font-light text-muted-foreground/50 italic">
            Your north star one-liner goes here
          </p>
        )}

        {/* Validation Stage */}
        {blueprint.validation_stage && (
          <div className="flex items-center">
            <span className="badge-gold">STAGE: {(blueprint.validation_stage || "").toUpperCase()}</span>
          </div>
        )}

        {/* Current Quarter Focus */}
        {currentQuarterFocus && (
          <div className="border border-border bg-secondary/50 p-5">
            <span className="label-mono block mb-2">CURRENT QUARTER FOCUS</span>
            {currentQuarterFocus.title && (
              <p className="text-sm font-medium text-foreground">{String(currentQuarterFocus.title)}</p>
            )}
            {currentQuarterFocus.description && (
              <p className="text-sm font-light text-muted-foreground mt-1">{String(currentQuarterFocus.description)}</p>
            )}
            {currentQuarterFocus.goals && Array.isArray(currentQuarterFocus.goals) && (
              <ul className="mt-2 space-y-1">
                {currentQuarterFocus.goals.map((goal, i) => (
                  <li key={i} className="text-[0.82rem] font-light text-muted-foreground flex items-start gap-2">
                    <span className="text-primary shrink-0">—</span>
                    {String(goal)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* AI Summary */}
        {blueprint.ai_summary && (
          <div className="border-t border-border pt-4">
            <span className="label-mono-gold flex items-center gap-1 mb-2">
              <Sparkles className="h-3 w-3" /> AI SUMMARY
            </span>
            <p className="text-sm font-light italic text-muted-foreground leading-relaxed">
              {blueprint.ai_summary}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 space-y-2">
          <button
            className="w-full bg-primary text-primary-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-opacity hover:opacity-90"
            onClick={() => onEditSection("full_blueprint")}
          >
            <RefreshCw className="h-3.5 w-3.5 inline mr-2" />
            UPDATE BLUEPRINT
          </button>
          <button
            className="w-full border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase py-3 transition-colors hover:text-foreground hover:bg-secondary disabled:opacity-40"
            onClick={handleGenerateMoves}
            disabled={generatingMoves}
          >
            <Sparkles className={`h-3.5 w-3.5 inline mr-2 ${generatingMoves ? "animate-pulse" : ""}`} />
            {generatingMoves ? "ADDING MOVES…" : "GENERATE NEXT 5 MOVES"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NorthStarSnapshot;
