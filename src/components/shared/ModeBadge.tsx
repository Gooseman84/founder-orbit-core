// Unified mode badge component for displaying idea generation modes
import { cn } from "@/lib/utils";
import { 
  Sparkles, Zap, Brain, Bot, Ghost, Rocket, 
  Flame, DollarSign, Share2, Target, FlaskConical, Blend 
} from "lucide-react";

type IdeaMode = 
  | "breadth" 
  | "focus" 
  | "creator" 
  | "automation" 
  | "persona" 
  | "boundless" 
  | "locker_room" 
  | "chaos" 
  | "money_printer" 
  | "memetic"
  | "fusion"
  | string;

interface ModeBadgeProps {
  mode: IdeaMode | null | undefined;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

const MODE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  breadth: {
    label: "Breadth",
    icon: Sparkles,
    color: "text-foreground",
    bgColor: "bg-muted",
  },
  focus: {
    label: "Focus",
    icon: Target,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  creator: {
    label: "Creator",
    icon: Share2,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  automation: {
    label: "Automation",
    icon: Bot,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  persona: {
    label: "Persona",
    icon: Ghost,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-500/10",
  },
  boundless: {
    label: "Boundless",
    icon: Rocket,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  locker_room: {
    label: "Locker Room",
    icon: Flame,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
  chaos: {
    label: "Chaos",
    icon: Zap,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  money_printer: {
    label: "Money Printer",
    icon: DollarSign,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  memetic: {
    label: "Memetic",
    icon: Brain,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  fusion: {
    label: "Fusion",
    icon: Blend,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  variant_chaos: {
    label: "Variant (Chaos)",
    icon: FlaskConical,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  variant_creator: {
    label: "Variant (Creator)",
    icon: FlaskConical,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  variant_automation: {
    label: "Variant (Automation)",
    icon: FlaskConical,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-500/10",
  },
  variant_memetic: {
    label: "Variant (Memetic)",
    icon: FlaskConical,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
  },
};

export function ModeBadge({ mode, size = "md", showIcon = true, className }: ModeBadgeProps) {
  if (!mode) return null;
  
  // Handle variant modes
  const normalizedMode = mode.toLowerCase();
  const config = MODE_CONFIG[normalizedMode] || {
    label: mode.charAt(0).toUpperCase() + mode.slice(1).replace(/_/g, " "),
    icon: Sparkles,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  };
  
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-0.5 text-xs gap-1",
    lg: "px-2.5 py-1 text-sm gap-1.5",
  };
  
  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };
  
  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-semibold",
      sizeClasses[size],
      config.bgColor,
      config.color,
      className
    )}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

// Export mode config for use elsewhere
export { MODE_CONFIG };
