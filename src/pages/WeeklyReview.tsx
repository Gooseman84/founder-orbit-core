import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { WeeklySummaryCard } from "@/components/reflection/WeeklySummaryCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Sparkles, Calendar } from "lucide-react";

export default function WeeklyReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const generateWeeklySummary = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please log in to generate your weekly review.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await invokeAuthedFunction<{ error?: string; message?: string; summary?: any }>(
        "generate-weekly-summary",
        {}
      );

      if (error) {
        console.error("Error generating summary:", error);
        throw error;
      }

      if (data?.error) {
        toast({
          title: "Not enough data",
          description: data.message || data.error,
          variant: "destructive",
        });
        return;
      }

      if (!data?.summary) {
        throw new Error("No summary data returned");
      }

      setSummary(data.summary);

      toast({
        title: "Weekly review generated!",
        description: "Your week has been summarized.",
      });

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate weekly review.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/daily-reflection")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
            <p className="text-muted-foreground mt-1">
              Reflect on your week and set intentions for the next
            </p>
          </div>
        </div>
      </div>

      {/* Summary Display */}
      {summary ? (
        <WeeklySummaryCard summary={summary} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Generate Your Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Review the last 7 days of your daily check-ins and get AI-powered insights 
              including your top wins, challenges faced, and focus areas for the upcoming week.
            </p>
            <p className="text-sm text-muted-foreground">
              Note: You need at least one daily check-in from the past week to generate a summary.
            </p>
            <Button onClick={generateWeeklySummary} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing your week...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Weekly Summary
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Regenerate option */}
      {summary && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={generateWeeklySummary} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate Summary
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
