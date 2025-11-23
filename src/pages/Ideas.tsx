import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIdeas } from "@/hooks/useIdeas";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import { RefreshCw } from "lucide-react";

const Ideas = () => {
  const { ideas, isLoading, generateIdeas } = useIdeas();
  const { toast } = useToast();

  const handleGenerateIdeas = async () => {
    try {
      await generateIdeas.mutateAsync();
      toast({
        title: "Ideas Generated!",
        description: "Your personalized business ideas are ready.",
      });
    } catch (error: any) {
      console.error("Error generating ideas:", error);
      
      let errorMessage = "Failed to generate ideas. Please try again.";
      
      if (error.message?.includes("profile not found")) {
        errorMessage = "Please complete your onboarding profile first.";
      } else if (error.message?.includes("Rate limit")) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (error.message?.includes("Payment required")) {
        errorMessage = "AI service requires payment. Please contact support.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your ideas...</p>
        </div>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <EmptyIdeasState
        onGenerateIdeas={handleGenerateIdeas}
        isGenerating={generateIdeas.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Business Ideas</h1>
          <p className="text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"} generated based on your profile
          </p>
        </div>
        
        <Button
          onClick={handleGenerateIdeas}
          disabled={generateIdeas.isPending}
          className="gap-2"
        >
          {generateIdeas.isPending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Generate More Ideas
            </>
          )}
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </div>
  );
};

export default Ideas;
