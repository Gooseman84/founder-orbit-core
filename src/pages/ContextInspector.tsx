import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext, type ContextEvent } from "@/hooks/useUserContext";
import { useAuth } from "@/hooks/useAuth";
import { FounderProfileCard } from "@/components/context-inspector/FounderProfileCard";
import { ExtendedIntakeCard } from "@/components/context-inspector/ExtendedIntakeCard";
import { ChosenIdeaCard } from "@/components/context-inspector/ChosenIdeaCard";
import { WorkspaceDocsCard } from "@/components/context-inspector/WorkspaceDocsCard";
import { ReflectionPatternsCard } from "@/components/context-inspector/ReflectionPatternsCard";
import { ExecutionPatternsCard } from "@/components/context-inspector/ExecutionPatternsCard";
import { AIInterpretationCard } from "@/components/context-inspector/AIInterpretationCard";
import { ContextHistoryCard } from "@/components/context-inspector/ContextHistoryCard";
import { Eye, Info, FileDown, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ContextInspector() {
  const { context, loading, error } = useUserContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExportContextDoc = async () => {
    if (!context || !user?.id) {
      toast.error("No context available to export");
      return;
    }

    setExporting(true);
    try {
      // Call the edge function to generate the document
      const { data: funcData, error: funcError } = await invokeAuthedFunction<{ content?: string; error?: string }>(
        "generate-context-doc",
        { body: { context } }
      );

      if (funcError) throw funcError;
      if (funcData?.error) throw new Error(funcData.error);

      const content = funcData?.content;
      if (!content) throw new Error("No content generated");

      // Save as workspace document
      const today = format(new Date(), "yyyy-MM-dd");
      const title = `AI Context Snapshot – ${today}`;

      const { data: doc, error: insertError } = await supabase
        .from("workspace_documents")
        .insert({
          user_id: user.id,
          title,
          doc_type: "context_snapshot",
          content,
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      toast.success("Context snapshot created in your Workspace.", {
        action: {
          label: "View Document",
          onClick: () => navigate(`/workspace?doc=${doc.id}`),
        },
      });
    } catch (err) {
      console.error("Export error:", err);
      const message = err instanceof Error ? err.message : "Failed to export context";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  const handleContextEventClick = (event: ContextEvent) => {
    if (event.targetRoute) {
      navigate(event.targetRoute);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Eye className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Context Inspector</h1>
            <p className="text-muted-foreground">
              Everything your AI cofounder knows about you right now
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-start">
          {/* Export Button */}
          <Button
            variant="outline"
            onClick={handleExportContextDoc}
            disabled={loading || exporting || !context}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export as Context Doc
          </Button>

          {/* Profile Completeness */}
          {!loading && context && (
            <div className="w-full sm:w-64 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completeness</span>
                <span className={`text-sm font-semibold ${
                  context.profileCompleteness < 45 
                    ? "text-destructive" 
                    : context.profileCompleteness < 85 
                      ? "text-foreground" 
                      : "text-green-600 dark:text-green-400"
                }`}>
                  {context.profileCompleteness}%
                </span>
              </div>
              <Progress 
                value={context.profileCompleteness} 
                className={`h-2 ${
                  context.profileCompleteness < 45 
                    ? "[&>div]:bg-destructive" 
                    : context.profileCompleteness < 85 
                      ? "[&>div]:bg-primary" 
                      : "[&>div]:bg-green-600 dark:[&>div]:bg-green-400"
                }`}
              />
              <p className={`text-xs mt-2 ${
                context.profileCompleteness < 45 
                  ? "text-destructive" 
                  : "text-muted-foreground"
              }`}>
                {context.profileCompleteness < 45 
                  ? "AI is missing important info." 
                  : context.profileCompleteness < 85 
                    ? "Solid foundation. You can still go deeper." 
                    : "Your AI has rich context to work with."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This page shows all the data your AI uses to personalize recommendations, tasks, and insights. 
          The more complete your profile and activity, the better the AI can assist you.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Interpretation - Featured at top */}
      <AIInterpretationCard context={context} loading={loading} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <FounderProfileCard profile={context?.profile} loading={loading} />
          <ExtendedIntakeCard extendedIntake={context?.extendedIntake} loading={loading} />
          <ReflectionPatternsCard reflections={context?.recentReflections || []} loading={loading} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ChosenIdeaCard 
            idea={context?.chosenIdea} 
            analysis={context?.ideaAnalysis} 
            loading={loading} 
          />
          <WorkspaceDocsCard docs={context?.recentDocs || []} loading={loading} />
          <ExecutionPatternsCard 
            tasks={context?.recentTasks || []} 
            streakData={context?.streakData}
            xpTotal={context?.xpTotal || 0}
            loading={loading} 
          />
        </div>
      </div>

      {/* Context History Timeline */}
      <ContextHistoryCard 
        events={context?.contextHistory || []} 
        loading={loading}
        onEventClick={handleContextEventClick}
      />
    </div>
  );
}
