import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PromptViewer } from "@/components/shared/PromptViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";

interface MasterPromptData {
  idea_id: string;
  platform_target: string;
  prompt_body: string;
}

export default function NorthStar() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState<MasterPromptData | null>(null);
  const [ideaTitle, setIdeaTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchMasterPrompt = async () => {
    try {
      setGenerating(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to generate a master prompt");
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        "generate-master-prompt",
        {
          body: { userId: user.id },
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

      // Fetch the idea title
      const { data: ideaData } = await supabase
        .from("ideas")
        .select("title")
        .eq("id", data.idea_id)
        .single();

      if (ideaData) {
        setIdeaTitle(ideaData.title);
      }

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
    fetchMasterPrompt();
  }, []);

  const handleRegenerate = () => {
    fetchMasterPrompt();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Generating your North Star master prompt...</p>
        </div>
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
          <h2 className="text-xl font-semibold">No Master Prompt Available</h2>
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

          <PromptViewer promptBody={masterPrompt.prompt_body} ideaTitle={ideaTitle} />
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
