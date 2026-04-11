import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IdeaScoredCard } from "@/components/ideas/IdeaScoredCard";
import { EmptyIdeasState } from "@/components/ideas/EmptyIdeasState";
import { IdeaFilters, type IdeaFiltersState } from "@/components/ideas/IdeaFilters";
import { IdeaFusionPanel } from "@/components/ideas/IdeaFusionPanel";
import { ModeSelector, type IdeaMode } from "@/components/ideas/ModeSelector";
import { SORT_OPTIONS, type SortMode } from "./ideaUtils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Trash2, Target, X, RotateCcw } from "lucide-react";
import type { BusinessIdea, BusinessIdeaV6 } from "@/types/businessIdea";

interface ScoredIdea {
  idea: BusinessIdea | BusinessIdeaV6;
  scores: { overall: number; founderFit: number; marketFit: number; constraintsFit: number; economics: number };
}

interface GeneratedTabProps {
  filteredFounderIdeas: ScoredIdea[];
  isGeneratingFounderIdeas: boolean;
  retryableError: boolean;
  selectedMode: IdeaMode;
  setSelectedMode: (mode: IdeaMode) => void;
  focusArea: string;
  setFocusArea: (area: string) => void;
  edgyMode: string | null;
  hasPro: boolean;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  filters: IdeaFiltersState;
  setFilters: (filters: IdeaFiltersState) => void;
  availableArchetypes: string[];
  availableMarkets: string[];
  showFilters: boolean;
  sessionIdeas: any[];
  libraryIdeas: any[];
  ideationDisabled: boolean;
  ideationDisabledReason: string | null;
  onGenerateIdeas: () => void;
  onClearSession: () => void;
  onProModeClick: (mode: IdeaMode) => void;
  onSaveIdea: (idea: BusinessIdea | BusinessIdeaV6) => Promise<string | null>;
  onPromoteIdea: (idea: BusinessIdea | BusinessIdeaV6) => void;
  onViewDetails: (idea: BusinessIdea | BusinessIdeaV6) => void;
  isIdeaSaved: (id: string) => boolean;
  isSaving: boolean;
  savingIdeaId: string | null;
  isPromoting: boolean;
  promotingIdeaId: string | null;
  openingIdeaId: string | null;
  onFusionComplete: (fusedIdea: any) => void;
}

export function GeneratedTab({
  filteredFounderIdeas,
  isGeneratingFounderIdeas,
  retryableError,
  selectedMode,
  setSelectedMode,
  focusArea,
  setFocusArea,
  edgyMode,
  hasPro,
  sortMode,
  setSortMode,
  filters,
  setFilters,
  availableArchetypes,
  availableMarkets,
  showFilters,
  sessionIdeas,
  libraryIdeas,
  ideationDisabled,
  ideationDisabledReason,
  onGenerateIdeas,
  onClearSession,
  onProModeClick,
  onSaveIdea,
  onPromoteIdea,
  onViewDetails,
  isIdeaSaved,
  isSaving,
  savingIdeaId,
  isPromoting,
  promotingIdeaId,
  openingIdeaId,
  onFusionComplete,
}: GeneratedTabProps) {
  return (
    <div className="space-y-4">
      {/* Mode Selector with Focus Area */}
      <div className="border border-border bg-card p-4">
        <ModeSelector
          selectedMode={selectedMode}
          onModeChange={setSelectedMode}
          focusArea={focusArea}
          onFocusAreaChange={setFocusArea}
          edgyMode={edgyMode}
          isPro={hasPro}
          onProModeClick={onProModeClick}
        />

        {/* Active Focus Pill */}
        {focusArea && (
          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-primary/35 text-primary text-sm">
              <Target className="w-3.5 h-3.5" />
              <span>Focused on: "{focusArea.length > 30 ? focusArea.slice(0, 30) + "..." : focusArea}"</span>
              <button onClick={() => setFocusArea("")} className="ml-1 hover:bg-primary/20 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center gap-2">
          {sessionIdeas.length > 0 && (
            <Button onClick={onClearSession} variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
              Clear Session
            </Button>
          )}
          <div className="flex-1" />
          <Button onClick={onGenerateIdeas} disabled={ideationDisabled} className="gap-2" title={ideationDisabledReason || undefined}>
            {isGeneratingFounderIdeas ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4" />Generate {selectedMode === "breadth" ? "" : selectedMode.replace("_", " ").charAt(0).toUpperCase() + selectedMode.replace("_", " ").slice(1)} Ideas</>
            )}
          </Button>
        </div>

        {/* Free tier limit notice */}
        {!hasPro && sessionIdeas.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Free tier: 1 session only. Upgrade to Pro for unlimited generations.
          </p>
        )}
      </div>

      {/* Retry UI for truncated AI responses */}
      {retryableError && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <RotateCcw className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Oops! The idea generation was interrupted.</p>
              <p className="text-sm text-muted-foreground">This sometimes happens when the AI response is incomplete. Click below to try again.</p>
            </div>
            <Button onClick={onGenerateIdeas} disabled={isGeneratingFounderIdeas} variant="outline" className="gap-2 shrink-0 border-amber-500/50 hover:bg-amber-500/10">
              {isGeneratingFounderIdeas ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />Retrying...</>
              ) : (
                <><RotateCcw className="w-4 h-4" />Try Again</>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showFilters && (
        <IdeaFilters filters={filters} onFiltersChange={setFilters} availableArchetypes={availableArchetypes} availableMarkets={availableMarkets} />
      )}

      {filteredFounderIdeas.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className="label-mono-gold">GENERATED IDEAS</span>
              <p className="text-sm font-light text-muted-foreground mt-1">AI-powered ideas from your profile. Save the ones you like.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="label-mono">SORT:</span>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="w-[180px] border-border bg-card text-[0.75rem]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredFounderIdeas.map(({ idea, scores }) => (
              <IdeaScoredCard
                key={idea.id}
                idea={idea}
                scores={scores}
                isSaved={isIdeaSaved(idea.id)}
                isSaving={isSaving || savingIdeaId === idea.id}
                isPromoting={isPromoting || promotingIdeaId === idea.id}
                isOpening={openingIdeaId === idea.id}
                onSave={() => onSaveIdea(idea)}
                onPromote={() => onPromoteIdea(idea)}
                onViewDetails={() => onViewDetails(idea)}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyIdeasState onGenerateIdeas={onGenerateIdeas} isGenerating={isGeneratingFounderIdeas} />
      )}

      {/* Fusion Panel - Pro only */}
      {hasPro && (libraryIdeas.length + sessionIdeas.length) >= 2 && (
        <IdeaFusionPanel
          ideas={libraryIdeas}
          sessionIdeas={sessionIdeas}
          showSessionGroup
          onFusionComplete={onFusionComplete}
        />
      )}
    </div>
  );
}
