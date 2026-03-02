import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  { value: "lte5", label: "≤ 5 HRS" },
  { value: "5to10", label: "5–10 HRS" },
  { value: "10to20", label: "10–20 HRS" },
  { value: "20plus", label: "20+ HRS" },
];

const CAPITAL_OPTIONS = [
  { value: "lte1k", label: "≤ $1K" },
  { value: "1kto5k", label: "$1K–$5K" },
  { value: "5kto20k", label: "$5K–$20K" },
  { value: "20kplus", label: "$20K+" },
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

  const FilterButton = ({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-3 py-2 border transition-colors ${
        active
          ? "border-primary/35 text-primary bg-primary/10"
          : "border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Archetype Filter */}
        {availableArchetypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-3 py-2 border border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary transition-colors">
                ARCHETYPE
                {filters.archetypes.length > 0 && (
                  <span className="badge-gold ml-1 py-0 px-1">{filters.archetypes.length}</span>
                )}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-popover z-50">
              <DropdownMenuLabel className="label-mono">BUSINESS ARCHETYPE</DropdownMenuLabel>
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
              <button className="flex items-center gap-1.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-3 py-2 border border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary transition-colors">
                MARKET
                {filters.markets.length > 0 && (
                  <span className="badge-gold ml-1 py-0 px-1">{filters.markets.length}</span>
                )}
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto bg-popover z-50">
              <DropdownMenuLabel className="label-mono">MARKET / VERTICAL</DropdownMenuLabel>
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
            <button className="flex items-center gap-1.5 font-mono-tb text-[0.65rem] tracking-[0.08em] uppercase px-3 py-2 border border-border text-muted-foreground bg-card hover:text-foreground hover:bg-secondary transition-colors">
              RISK
              {filters.riskLevels.length > 0 && (
                <span className="badge-gold ml-1 py-0 px-1">{filters.riskLevels.length}</span>
              )}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-40 bg-popover z-50">
            <DropdownMenuLabel className="label-mono">RISK LEVEL</DropdownMenuLabel>
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
        <div className="flex items-center gap-1.5">
          <span className="label-mono">TIME:</span>
          {TIME_OPTIONS.map((opt) => (
            <FilterButton
              key={opt.value}
              active={filters.timeCommitment === opt.value}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  timeCommitment: filters.timeCommitment === opt.value ? null : opt.value,
                })
              }
            >
              {opt.label}
            </FilterButton>
          ))}
        </div>

        {/* Capital Required */}
        <div className="flex items-center gap-1.5">
          <span className="label-mono">CAPITAL:</span>
          {CAPITAL_OPTIONS.map((opt) => (
            <FilterButton
              key={opt.value}
              active={filters.capitalRequired === opt.value}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  capitalRequired: filters.capitalRequired === opt.value ? null : opt.value,
                })
              }
            >
              {opt.label}
            </FilterButton>
          ))}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 font-mono-tb text-[0.65rem] uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
          >
            <X className="h-3 w-3" />
            CLEAR
          </button>
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
