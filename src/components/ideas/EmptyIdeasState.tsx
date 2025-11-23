import { Button } from "@/components/ui/button";
import { Lightbulb, Sparkles } from "lucide-react";

interface EmptyIdeasStateProps {
  onGenerateIdeas: () => void;
  isGenerating: boolean;
}

export const EmptyIdeasState = ({ onGenerateIdeas, isGenerating }: EmptyIdeasStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Lightbulb className="w-10 h-10 text-primary" />
      </div>
      
      <h2 className="text-3xl font-bold mb-3">No Ideas Yet</h2>
      <p className="text-muted-foreground text-lg mb-8 max-w-md">
        Let AI analyze your profile and generate personalized business ideas tailored to your passions, skills, and constraints.
      </p>
      
      <Button
        size="lg"
        onClick={onGenerateIdeas}
        disabled={isGenerating}
        className="gap-2"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Generating Ideas...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Ideas for Me
          </>
        )}
      </Button>
      
      {isGenerating && (
        <p className="text-sm text-muted-foreground mt-4">
          This may take 10-20 seconds...
        </p>
      )}
    </div>
  );
};
