import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Sparkles, 
  Target, 
  Video, 
  Cpu, 
  User, 
  Infinity, 
  Flame, 
  DollarSign, 
  Share2, 
  MessageCircle,
  Lock,
  Crown
} from "lucide-react";
import { IDEA_MODES, type IdeaMode, modeRequiresPro } from "@/config/plans";

interface ModeOption {
  mode: IdeaMode;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresEdgy?: "bold" | "unhinged";
  requiresPro: boolean;
}

const MODE_ICONS: Record<IdeaMode, React.ElementType> = {
  breadth: Sparkles,
  focus: Target,
  creator: Video,
  automation: Cpu,
  persona: User,
  boundless: Infinity,
  chaos: Flame,
  money_printer: DollarSign,
  memetic: Share2,
  locker_room: MessageCircle,
};

const MODE_OPTIONS: ModeOption[] = IDEA_MODES.map(m => ({
  mode: m.mode,
  label: m.label,
  description: m.description,
  icon: MODE_ICONS[m.mode],
  requiresPro: m.requiresPro,
  requiresEdgy: m.mode === "locker_room" ? "bold" : undefined,
}));

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
  edgyMode,
  className,
  isPro = false,
  onProModeClick,
}: ModeSelectorProps) {
  // Filter modes based on edgy_mode for locker_room
  const availableModes = MODE_OPTIONS.filter((option) => {
    if (!option.requiresEdgy) return true;
    if (option.requiresEdgy === "bold") {
      return edgyMode === "bold" || edgyMode === "unhinged";
    }
    if (option.requiresEdgy === "unhinged") {
      return edgyMode === "unhinged";
    }
    return true;
  });

  const handleModeClick = (option: ModeOption) => {
    // If mode requires Pro and user doesn't have it, trigger paywall
    if (option.requiresPro && !isPro) {
      onProModeClick?.(option.mode);
      return;
    }
    onModeChange(option.mode);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Generation Mode</h3>
        {!isPro && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Crown className="w-3 h-3 text-primary" />
            Pro modes locked
          </span>
        )}
      </div>
      {/* Horizontal scrollable strip on mobile, wrap on desktop */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 md:flex-wrap scrollbar-hide">
        {availableModes.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMode === option.mode;
          const isLocked = option.requiresPro && !isPro;
          
          return (
            <button
              key={option.mode}
              onClick={() => handleModeClick(option)}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                isLocked 
                  ? "border-border bg-muted/30 text-muted-foreground cursor-pointer hover:border-primary/30"
                  : "hover:border-primary/50 hover:bg-primary/5",
                isSelected && !isLocked
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm" 
                  : !isLocked && "border-border bg-background text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isLocked 
                  ? "text-muted-foreground/50" 
                  : isSelected 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-primary/70"
              )} />
              <span className={isLocked ? "opacity-60" : ""}>{option.label}</span>
              
              {/* Lock icon for Pro modes */}
              {isLocked && (
                <Lock className="w-3 h-3 text-primary ml-1" />
              )}
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-md shadow-lg text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {isLocked ? (
                  <span className="flex items-center gap-1">
                    <Crown className="w-3 h-3 text-primary" />
                    Pro: {option.description}
                  </span>
                ) : (
                  option.description
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Selected mode description */}
      <p className="text-xs text-muted-foreground">
        {MODE_OPTIONS.find(m => m.mode === selectedMode)?.description}
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
