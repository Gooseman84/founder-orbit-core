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
  MessageCircle 
} from "lucide-react";

export type IdeaMode = 
  | "breadth" 
  | "focus" 
  | "creator" 
  | "automation" 
  | "persona" 
  | "boundless" 
  | "chaos" 
  | "money_printer" 
  | "memetic" 
  | "locker_room";

interface ModeOption {
  mode: IdeaMode;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresEdgy?: "bold" | "unhinged";
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: "breadth",
    label: "Standard",
    description: "Wide sampling across all sane categories",
    icon: Sparkles,
  },
  {
    mode: "focus",
    label: "Focus",
    description: "Deep exploration of one niche or theme",
    icon: Target,
  },
  {
    mode: "creator",
    label: "Creator",
    description: "Content empires, creator tools, monetization",
    icon: Video,
  },
  {
    mode: "automation",
    label: "Automation",
    description: "Workflow, RPA, agents, 'do it for me' backends",
    icon: Cpu,
  },
  {
    mode: "persona",
    label: "Persona",
    description: "AI characters, avatars, companions, mentors",
    icon: User,
  },
  {
    mode: "boundless",
    label: "Boundless",
    description: "Ignore conventions; maximize creativity",
    icon: Infinity,
  },
  {
    mode: "chaos",
    label: "Chaos",
    description: "Wild combinations; high shock, high leverage",
    icon: Flame,
  },
  {
    mode: "money_printer",
    label: "Money Printer",
    description: "Systems that earn while you sleep",
    icon: DollarSign,
  },
  {
    mode: "memetic",
    label: "Memetic",
    description: "Ideas that spread as jokes/memes with monetization",
    icon: Share2,
  },
  {
    mode: "locker_room",
    label: "Locker Room",
    description: "Bold, culture-first, 'shouldn't exist but could'",
    icon: MessageCircle,
    requiresEdgy: "bold",
  },
];

interface ModeSelectorProps {
  selectedMode: IdeaMode;
  onModeChange: (mode: IdeaMode) => void;
  focusArea?: string;
  onFocusAreaChange?: (value: string) => void;
  edgyMode?: string | null;
  className?: string;
}

export function ModeSelector({ 
  selectedMode, 
  onModeChange, 
  focusArea = "",
  onFocusAreaChange,
  edgyMode,
  className 
}: ModeSelectorProps) {
  // Filter modes based on edgy_mode
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

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Generation Mode</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableModes.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedMode === option.mode;
          
          return (
            <button
              key={option.mode}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                "group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                "hover:border-primary/50 hover:bg-primary/5",
                isSelected 
                  ? "border-primary bg-primary/10 text-primary font-medium shadow-sm" 
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary/70"
              )} />
              <span>{option.label}</span>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border rounded-md shadow-lg text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {option.description}
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
