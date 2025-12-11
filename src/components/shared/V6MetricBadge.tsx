// Unified v6 metric badge component used across all idea views
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, TrendingUp, Bot, Star, Users, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type MetricType = "virality" | "leverage" | "automation" | "autonomy" | "culture" | "chaos" | "shock";

interface V6MetricBadgeProps {
  type: MetricType;
  value: number | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const METRIC_CONFIG: Record<MetricType, {
  icon: React.ElementType;
  label: string;
  tooltip: string;
  color: string;
  bgColor: string;
}> = {
  virality: {
    icon: Flame,
    label: "Virality",
    tooltip: "How easily this spreads through word-of-mouth and social sharing",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
  },
  leverage: {
    icon: TrendingUp,
    label: "Leverage",
    tooltip: "How much output you get per unit of input (scalability potential)",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
  },
  automation: {
    icon: Bot,
    label: "Automation",
    tooltip: "How much of this business can run without your direct involvement",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  autonomy: {
    icon: Star,
    label: "Autonomy",
    tooltip: "How hands-off this business is once established",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  culture: {
    icon: Users,
    label: "Culture Tailwind",
    tooltip: "How aligned with current cultural momentum and trends",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
  },
  chaos: {
    icon: Zap,
    label: "Chaos Factor",
    tooltip: "How wild/non-traditional the concept is (high = more experimental)",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  shock: {
    icon: Sparkles,
    label: "Shock Factor",
    tooltip: "How surprising or attention-grabbing this idea is",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-500/10",
  },
};

export function V6MetricBadge({ type, value, showLabel = true, size = "md", className }: V6MetricBadgeProps) {
  if (value == null) return null;
  
  const config = METRIC_CONFIG[type];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-1",
    md: "px-2 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };
  
  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center rounded-md font-medium cursor-help transition-colors",
            sizeClasses[size],
            config.bgColor,
            config.color,
            className
          )}>
            <Icon className={iconSizes[size]} />
            {showLabel && <span>{config.label}:</span>}
            <span className="font-bold">{value}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact grid display of all v6 metrics
interface V6MetricsGridProps {
  virality?: number | null;
  leverage?: number | null;
  automation?: number | null;
  autonomy?: number | null;
  culture?: number | null;
  chaos?: number | null;
  shock?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function V6MetricsGrid({
  virality,
  leverage,
  automation,
  autonomy,
  culture,
  chaos,
  shock,
  size = "md",
  className,
}: V6MetricsGridProps) {
  const hasMetrics = [virality, leverage, automation, autonomy, culture, chaos, shock].some(v => v != null);
  
  if (!hasMetrics) return null;
  
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <V6MetricBadge type="virality" value={virality} size={size} />
      <V6MetricBadge type="leverage" value={leverage} size={size} />
      <V6MetricBadge type="automation" value={automation} size={size} />
      <V6MetricBadge type="autonomy" value={autonomy} size={size} />
      <V6MetricBadge type="culture" value={culture} size={size} />
      <V6MetricBadge type="chaos" value={chaos} size={size} />
      <V6MetricBadge type="shock" value={shock} size={size} />
    </div>
  );
}

// Compact inline display (just values)
export function V6MetricsInline({
  virality,
  leverage,
  automation,
  size = "sm",
  className,
}: {
  virality?: number | null;
  leverage?: number | null;
  automation?: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const hasMetrics = [virality, leverage, automation].some(v => v != null);
  
  if (!hasMetrics) return null;
  
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      <V6MetricBadge type="virality" value={virality} size={size} showLabel={false} />
      <V6MetricBadge type="leverage" value={leverage} size={size} showLabel={false} />
      <V6MetricBadge type="automation" value={automation} size={size} showLabel={false} />
    </div>
  );
}
