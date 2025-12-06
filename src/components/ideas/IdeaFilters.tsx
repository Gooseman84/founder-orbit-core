import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ChevronDown, X } from "lucide-react";

export interface IdeaFiltersState {
  archetypes: string[];
  markets: string[];
  riskLevels: string[];
  timeCommitment: string | null;
  capitalRequired: string | null;
}

interface IdeaFiltersProps {
  filters: IdeaFiltersState;
  onFiltersChange: (filters: IdeaFiltersState) => void;
  availableArchetypes: string[];
  availableMarkets: string[];
}

const TIME_OPTIONS = [
  { value: "lte5", label: "≤ 5 hrs" },
  { value: "5to10", label: "5–10 hrs" },
  { value: "10to20", label: "10–20 hrs" },
  { value: "20plus", label: "20+ hrs" },
];

const CAPITAL_OPTIONS = [
  { value: "lte1k", label: "≤ $1k" },
  { value: "1kto5k", label: "$1k–$5k" },
  { value: "5kto20k", label: "$5k–$20k" },
  { value: "20kplus", label: "$20k+" },
];

const RISK_LEVELS = ["low", "medium", "high"];

export function IdeaFilters({
  filters,
  onFiltersChange,
  availableArchetypes,
  availableMarkets,
}: IdeaFiltersProps) {
  const hasActiveFilters =
    filters.archetypes.length > 0 ||
    filters.markets.length > 0 ||
    filters.riskLevels.length > 0 ||
    filters.timeCommitment !== null ||
    filters.capitalRequired !== null;

  const clearFilters = () => {
    onFiltersChange({
      archetypes: [],
      markets: [],
      riskLevels: [],
      timeCommitment: null,
      capitalRequired: null,
    });
  };

  const toggleArchetype = (archetype: string) => {
    const newArchetypes = filters.archetypes.includes(archetype)
      ? filters.archetypes.filter((a) => a !== archetype)
      : [...filters.archetypes, archetype];
    onFiltersChange({ ...filters, archetypes: newArchetypes });
  };

  const toggleMarket = (market: string) => {
    const newMarkets = filters.markets.includes(market)
      ? filters.markets.filter((m) => m !== market)
      : [...filters.markets, market];
    onFiltersChange({ ...filters, markets: newMarkets });
  };

  const toggleRisk = (risk: string) => {
    const newRisks = filters.riskLevels.includes(risk)
      ? filters.riskLevels.filter((r) => r !== risk)
      : [...filters.riskLevels, risk];
    onFiltersChange({ ...filters, riskLevels: newRisks });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Archetype Filter */}
        {availableArchetypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Archetype
                {filters.archetypes.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {filters.archetypes.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover z-50">
              <DropdownMenuLabel>Business Archetype</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableArchetypes.map((archetype) => (
                <DropdownMenuCheckboxItem
                  key={archetype}
                  checked={filters.archetypes.includes(archetype)}
                  onCheckedChange={() => toggleArchetype(archetype)}
                >
                  {archetype}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Market Filter */}
        {availableMarkets.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Market
                {filters.markets.length > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {filters.markets.length}
                  </Badge>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto bg-popover z-50">
              <DropdownMenuLabel>Market / Vertical</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableMarkets.map((market) => (
                <DropdownMenuCheckboxItem
                  key={market}
                  checked={filters.markets.includes(market)}
                  onCheckedChange={() => toggleMarket(market)}
                >
                  {market}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Risk Level Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              Risk
              {filters.riskLevels.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {filters.riskLevels.length}
                </Badge>
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 bg-popover z-50">
            <DropdownMenuLabel>Risk Level</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {RISK_LEVELS.map((risk) => (
              <DropdownMenuCheckboxItem
                key={risk}
                checked={filters.riskLevels.includes(risk)}
                onCheckedChange={() => toggleRisk(risk)}
              >
                {risk.charAt(0).toUpperCase() + risk.slice(1)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Time Commitment */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Time:</span>
          <ToggleGroup
            type="single"
            value={filters.timeCommitment ?? ""}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, timeCommitment: value || null })
            }
          >
            {TIME_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                size="sm"
                className="text-xs px-2"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Capital Required */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Capital:</span>
          <ToggleGroup
            type="single"
            value={filters.capitalRequired ?? ""}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, capitalRequired: value || null })
            }
          >
            {CAPITAL_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                size="sm"
                className="text-xs px-2"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-3 w-3" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

// Filter utility functions
export function filterByTime(
  hoursMin: number,
  hoursMax: number,
  timeFilter: string | null
): boolean {
  if (!timeFilter) return true;
  switch (timeFilter) {
    case "lte5":
      return hoursMax <= 5;
    case "5to10":
      return hoursMin >= 5 && hoursMax <= 10;
    case "10to20":
      return hoursMin >= 10 && hoursMax <= 20;
    case "20plus":
      return hoursMin >= 20;
    default:
      return true;
  }
}

export function filterByCapital(
  capital: number,
  capitalFilter: string | null
): boolean {
  if (!capitalFilter) return true;
  switch (capitalFilter) {
    case "lte1k":
      return capital <= 1000;
    case "1kto5k":
      return capital > 1000 && capital <= 5000;
    case "5kto20k":
      return capital > 5000 && capital <= 20000;
    case "20kplus":
      return capital > 20000;
    default:
      return true;
  }
}
