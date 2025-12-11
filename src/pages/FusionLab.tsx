import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIdeaSessionStore } from "@/store/ideaSessionStore";
import { IdeaFusionPanel } from "@/components/ideas/IdeaFusionPanel";
import { Combine, Sparkles, ExternalLink, ArrowLeft } from "lucide-react";

const FusionLab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessionIdeas } = useIdeaSessionStore();
  const [libraryIdeas, setLibraryIdeas] = useState<any[]>([]);
  const [fusionHistory, setFusionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch library ideas and fusion history
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        // Fetch all library ideas
        const { data: ideas } = await supabase
          .from("ideas")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        setLibraryIdeas(ideas || []);

        // Filter fusion history
        const fusions = (ideas || []).filter(
          (i) => i.mode === "fusion" || i.mode === "variant"
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

  const handleFusionComplete = (fusedIdea: any) => {
    // Add to fusion history
    setFusionHistory((prev) => [fusedIdea, ...prev]);
    setLibraryIdeas((prev) => [fusedIdea, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  // Combine library and session ideas for fusion panel
  const allIdeasForFusion = [
    ...libraryIdeas,
    ...sessionIdeas.filter(
      (si) => !libraryIdeas.some((li) => li.id === si.id)
    ),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/ideas")}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Ideas
          </Button>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <Combine className="h-8 w-8 text-primary" />
            Fusion Lab
          </h1>
          <p className="text-muted-foreground mt-1">
            Remix, combine, and evolve your ideas into stronger hybrids
          </p>
        </div>
      </div>

      {/* Remix Playground */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Remix Playground
        </h2>
        <p className="text-sm text-muted-foreground">
          Select 2-3 ideas from your library or current session to fuse them
          into a new hybrid. You can even fuse previous fusions!
        </p>

        {allIdeasForFusion.length >= 2 ? (
          <IdeaFusionPanel
            ideas={allIdeasForFusion}
            sessionIdeas={sessionIdeas}
            onFusionComplete={handleFusionComplete}
            showSessionGroup
          />
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                You need at least 2 ideas to start fusing.{" "}
                <Button variant="link" onClick={() => navigate("/ideas")}>
                  Generate some ideas first
                </Button>
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Fusion History */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Fusion History</h2>
        <p className="text-sm text-muted-foreground">
          Your previously fused and variant ideas
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fusionHistory.map((idea) => (
              <Card
                key={idea.id}
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/ideas/${idea.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {idea.title}
                    </CardTitle>
                    <Badge
                      variant={idea.mode === "fusion" ? "default" : "secondary"}
                      className="shrink-0"
                    >
                      {idea.mode === "fusion" ? "Fused" : "Variant"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {idea.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-wrap gap-2 mb-3">
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

                  {/* V6 Scores */}
                  {idea.virality_potential !== null && (
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>🔥 {idea.virality_potential}</span>
                      <span>⚡ {idea.leverage_score}</span>
                      <span>🤖 {idea.automation_density}</span>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-3 gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/ideas/${idea.id}`);
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Idea
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FusionLab;
