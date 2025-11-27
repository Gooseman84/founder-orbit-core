import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PromptViewer } from "@/components/shared/PromptViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";

interface MasterPromptData {
  idea_id: string;
  platform_target: string;
  prompt_body: string;
}

export default function NorthStar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState<MasterPromptData | null>(null);
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError("You must be logged in");
        setLoading(false);
        return;
      }

      // Step 1: Fetch the chosen idea
      const { data: chosenIdea, error: ideaError } = await supabase
        .from("ideas")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "chosen")
        .maybeSingle();

      if (ideaError) {
        console.error("Error fetching chosen idea:", ideaError);
        throw new Error("Failed to fetch chosen idea");
      }

      if (!chosenIdea) {
        setError("You must choose an idea before generating your Master Prompt");
        setLoading(false);
        return;
      }

      setChosenIdeaId(chosenIdea.id);
      setIdeaTitle(chosenIdea.title);

      // Step 1.5: Check if idea has been analyzed
      const { data: analysis, error: analysisError } = await supabase
        .from("idea_analysis")
        .select("id")
        .eq("idea_id", chosenIdea.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (analysisError && analysisError.code !== 'PGRST116') {
        console.error("Error checking idea analysis:", analysisError);
      }

      if (!analysis) {
        setError("Please analyze your chosen idea before generating your Master Prompt");
        setLoading(false);
        return;
      }

      // Step 2: Check if master prompt already exists for this idea
      const { data: existingPrompt, error: promptError } = await supabase
        .from("master_prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", chosenIdea.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (promptError && promptError.code !== 'PGRST116') {
        console.error("Error fetching master prompt:", promptError);
      }

      if (existingPrompt) {
        // Use existing prompt
        setMasterPrompt({
          idea_id: existingPrompt.idea_id,
          platform_target: existingPrompt.platform_target,
          prompt_body: existingPrompt.prompt_body,
        });
        setLoading(false);
      } else {
        // Step 3: Generate new master prompt if none exists
        await generateMasterPrompt(user.id, chosenIdea.id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const generateMasterPrompt = async (userId: string, ideaId: string) => {
    try {
      setGenerating(true);
      setError(null);

      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-master-prompt",
        {
          body: { userId, ideaId },
        }
      );

      if (functionError) {
        console.error("Error generating master prompt:", functionError);
        throw new Error(functionError.message || "Failed to generate master prompt");
      }

      if (!data) {
        throw new Error("No data returned from function");
      }

      setMasterPrompt(data);
      toast.success("Master prompt generated successfully!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate master prompt";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRegenerate = async () => {
    if (!user || !chosenIdeaId) {
      toast.error("Cannot regenerate: missing user or idea information");
      return;
    }
    await generateMasterPrompt(user.id, chosenIdeaId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {generating ? "Generating your North Star master prompt..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error === "Please analyze your chosen idea before generating your Master Prompt") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Your TrueBlazer Master Prompt</h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Idea Not Analyzed Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Before generating your Master Prompt, you need to analyze your chosen idea.
            This provides the strategic insights needed to create a personalized AI guidance system.
          </p>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            Analyze My Idea
          </Button>
        </Card>
      </div>
    );
  }

  if (error === "You must choose an idea before generating your Master Prompt") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Your TrueBlazer Master Prompt</h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No Chosen Idea Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You must choose an idea before generating your Master Prompt. The Master Prompt
            provides personalized AI guidance based on your chosen business idea.
          </p>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            View Ideas
          </Button>
        </Card>
      </div>
    );
  }

  if (error && !masterPrompt) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Card className="p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">Unable to Generate Master Prompt</h2>
          <p className="text-muted-foreground">
            To generate your North Star master prompt, you need to:
          </p>
          <ol className="text-left max-w-md mx-auto space-y-2 list-decimal list-inside">
            <li>Complete your founder profile</li>
            <li>Generate and select a business idea</li>
            <li>Analyze your chosen idea</li>
            <li>Set it as your main idea</li>
          </ol>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            Go to Ideas
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">North Star</h1>
        </div>
        <p className="text-muted-foreground">
          Your personalized AI guidance system for building {ideaTitle}
        </p>
      </div>

      {/* Usage Instructions */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          How to Use Your Master Prompt
        </h3>
        <div className="space-y-3 text-sm">
          <p>
            This master prompt is your personalized context for AI assistants. Copy it and paste it at the
            beginning of conversations in:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <strong>ChatGPT:</strong> Start a new chat, paste this prompt, then ask for advice
            </li>
            <li>
              <strong>Claude:</strong> Begin a conversation with this context for tailored guidance
            </li>
            <li>
              <strong>Lovable:</strong> Use in project knowledge settings for consistent AI assistance
            </li>
            <li>
              <strong>v0.dev:</strong> Include when generating components for your specific business
            </li>
          </ul>
          <p className="text-muted-foreground italic">
            💡 Tip: Save this prompt and reuse it across all your AI tools for consistent, personalized advice
            aligned with your goals and constraints.
          </p>
        </div>
      </Card>

      {/* Prompt Viewer */}
      {masterPrompt && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              Based on your chosen idea: <strong>{ideaTitle}</strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </>
              )}
            </Button>
          </div>

          <PromptViewer 
            prompt={masterPrompt.prompt_body} 
            filename={`trueblazer-${ideaTitle.toLowerCase().replace(/\s+/g, "-")}`}
          />
        </div>
      )}

      {/* Additional Actions */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="font-medium">Need to update your prompt?</p>
            <p className="text-muted-foreground text-xs">
              Update your profile or re-analyze your idea, then regenerate
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/profile")}>
            Edit Profile
          </Button>
        </div>
      </Card>
    </div>
  );
}
