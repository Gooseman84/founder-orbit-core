import { useUserContext } from "@/hooks/useUserContext";
import { FounderProfileCard } from "@/components/context-inspector/FounderProfileCard";
import { ExtendedIntakeCard } from "@/components/context-inspector/ExtendedIntakeCard";
import { ChosenIdeaCard } from "@/components/context-inspector/ChosenIdeaCard";
import { WorkspaceDocsCard } from "@/components/context-inspector/WorkspaceDocsCard";
import { ReflectionPatternsCard } from "@/components/context-inspector/ReflectionPatternsCard";
import { ExecutionPatternsCard } from "@/components/context-inspector/ExecutionPatternsCard";
import { AIInterpretationCard } from "@/components/context-inspector/AIInterpretationCard";
import { Eye, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ContextInspector() {
  const { context, loading, error } = useUserContext();

  return (
    <div className="space-y-6">
      {/* Header */}
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
    </div>
  );
}
