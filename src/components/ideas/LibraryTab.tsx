import { Button } from "@/components/ui/button";
import { IdeaFilters, type IdeaFiltersState } from "@/components/ideas/IdeaFilters";
import { LibraryIdeaCard } from "@/components/ideas/LibraryIdeaCard";
import { SOURCE_TYPE_FILTERS, type SourceTypeFilter } from "@/components/ideas/SourceTypeBadge";
import { useNavigate } from "react-router-dom";
import { Sparkles, Scale, X } from "lucide-react";

interface LibraryTabProps {
  filteredLibraryIdeas: any[];
  libraryIdeas: any[];
  sourceTypeFilter: SourceTypeFilter;
  setSourceTypeFilter: (filter: SourceTypeFilter) => void;
  sourceTypeCounts: Record<string, number>;
  newlyImportedIds: string[];
  setNewlyImportedIds: (ids: string[]) => void;
  filters: IdeaFiltersState;
  setFilters: (filters: IdeaFiltersState) => void;
  availableArchetypes: string[];
  availableMarkets: string[];
  showFilters: boolean;
  hasPro: boolean;
  activeVenture: any;
  onSetActiveTab: (tab: string) => void;
  onPromoteLibraryIdea: (ideaId: string) => void;
  onSetNorthStar?: (ideaId: string) => void;
}

export function LibraryTab({
  filteredLibraryIdeas,
  libraryIdeas,
  sourceTypeFilter,
  setSourceTypeFilter,
  sourceTypeCounts,
  newlyImportedIds,
  setNewlyImportedIds,
  filters,
  setFilters,
  availableArchetypes,
  availableMarkets,
  showFilters,
  hasPro,
  activeVenture,
  onSetActiveTab,
  onPromoteLibraryIdea,
  onSetNorthStar,
}: LibraryTabProps) {
  const navigate = useNavigate();

  if (filteredLibraryIdeas.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-primary text-[1.5rem] block mb-5">◆</span>
        <h3 className="font-display italic text-lg text-muted-foreground mb-2">Your library is empty</h3>
        <p className="text-sm font-light text-muted-foreground mb-4">
          Save generated ideas, variants, or fused concepts to build your library.
        </p>
        <button
          onClick={() => onSetActiveTab("generated")}
          className="border border-border text-muted-foreground font-medium text-[0.78rem] tracking-[0.06em] uppercase px-5 py-2.5 hover:text-foreground hover:bg-secondary transition-colors"
        >
          GO TO GENERATED IDEAS
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <span className="label-mono-gold">IDEAS LIBRARY</span>
          <p className="text-sm font-light text-muted-foreground mt-1">
            Your saved ideas, variants, and fused concepts.
          </p>
          {!hasPro && libraryIdeas.length >= 8 && (
            <p className="label-mono mt-1">
              {libraryIdeas.length}/10 IDEAS SAVED — UPGRADE FOR UNLIMITED
            </p>
          )}
        </div>
        {showFilters && (
          <IdeaFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableArchetypes={availableArchetypes}
            availableMarkets={availableMarkets}
          />
        )}
      </div>

      {/* Source Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {SOURCE_TYPE_FILTERS.map((filter) => {
          const count = sourceTypeCounts[filter.value] || 0;
          if (filter.value !== "all" && count === 0) return null;
          return (
            <Button
              key={filter.value}
              variant={sourceTypeFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceTypeFilter(filter.value)}
              className="gap-1.5"
            >
              {filter.label}
              <span className="text-xs opacity-70">({filter.value === "all" ? libraryIdeas.length : count})</span>
            </Button>
          );
        })}
      </div>

      {/* Newly Imported Ideas Banner */}
      {newlyImportedIds.length > 0 && sourceTypeFilter === "imported" && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Sparkles className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-violet-700 dark:text-violet-300">
                We generated {newlyImportedIds.length} variants. Pick the one you want to pursue.
              </p>
              <p className="text-sm text-muted-foreground">
                Each variant offers a different angle on your original idea.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {newlyImportedIds.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/ideas/compare?ids=${newlyImportedIds.join(",")}`)}
                className="gap-2"
              >
                <Scale className="w-4 h-4" />
                Compare Variants
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setNewlyImportedIds([])} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLibraryIdeas.map((idea) => (
          <LibraryIdeaCard
            key={idea.id}
            idea={idea}
            onPromote={onPromoteLibraryIdea}
            onSetNorthStar={!activeVenture ? onSetNorthStar : undefined}
            hasActiveVenture={!!activeVenture}
          />
        ))}
      </div>
    </div>
  );
}
