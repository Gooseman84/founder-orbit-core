import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, RefreshCw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { UserContextData } from "@/hooks/useUserContext";

interface AIInterpretationCardProps {
  context: UserContextData | null;
  loading?: boolean;
}

export function AIInterpretationCard({ context, loading }: AIInterpretationCardProps) {
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateInterpretation = async () => {
    if (!context) return;

    setGenerating(true);
    try {
      const data = await invokeAuthedFunction<any, { interpretation: string }>({
        functionName: "generate-context-interpretation",
        body: { context },
      });

      setInterpretation(data.interpretation);
    } catch (err: any) {
      console.error("Error generating interpretation:", err);
      toast({
        title: "Failed to generate interpretation",
        description: err.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            What Your AI Cofounder Believes About You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          What Your AI Cofounder Believes About You
          <Sparkles className="h-4 w-4 text-amber-500 ml-1" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!interpretation && !generating && (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-4">
              Generate an AI interpretation of your current context, focus, blind spots, and opportunities.
            </p>
            <Button onClick={generateInterpretation} disabled={!context}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Interpretation
            </Button>
          </div>
        )}

        {generating && (
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing your context...</span>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {interpretation && !generating && (
          <>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {interpretation.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateInterpretation}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
