import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Target, Shuffle } from "lucide-react";
import { IDEA_MODES, type IdeaMode } from "@/config/plans";

const MODE_ICONS: Record<IdeaMode, React.ElementType> = {
  breadth: Sparkles,
  focus: Target,
  adjacent: Shuffle,
};

interface ModeSelectorProps {
  selectedMode: IdeaMode;
  onModeChange: (mode: IdeaMode) => void;
  focusArea?: string;
  onFocusAreaChange?: (value: string) => void;
  edgyMode?: string | null;
  className?: string;
  isPro?: boolean;
  onProModeClick?: (mode: IdeaMode) => void;
}

export function ModeSelector({
  selectedMode,
  onModeChange,
  focusArea = "",
  onFocusAreaChange,
  className,
}: ModeSelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Generation Mode</h3>
      </div>

      <div className="flex gap-2">
        {IDEA_MODES.map((option) => {
          const Icon = MODE_ICONS[option.mode];
          const isSelected = selectedMode === option.mode;

          return (
            <button
              key={option.mode}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                "group relative flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all text-sm flex-1 justify-center",
                isSelected
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
              )} />
              <span>{option.label}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-md shadow-lg text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {option.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected mode description */}
      <p className="text-xs text-muted-foreground">
        {IDEA_MODES.find((m) => m.mode === selectedMode)?.description}
      </p>

      {/* Focus Area Input */}
      <div className="space-y-2 pt-2 border-t border-border">
        <Label htmlFor="focus-area" className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          Optional: What should we focus on?
        </Label>
        <Input
          id="focus-area"
          placeholder='e.g. "AI for real estate agents" or "TikTok offers for moms"'
          value={focusArea}
          onChange={(e) => onFocusAreaChange?.(e.target.value)}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Provide a niche, industry, or theme to guide idea generation
        </p>
      </div>
    </div>
  );
}

export type { IdeaMode };
