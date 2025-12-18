// src/components/ideas/SourceTypeBadge.tsx
// Badge component to display idea source type
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Upload, Layers } from "lucide-react";
import type { IdeaSourceType } from "@/types/ideaSource";

interface SourceTypeBadgeProps {
  sourceType: IdeaSourceType | string | null;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const SOURCE_CONFIG: Record<string, { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  className: string;
}> = {
  generated: {
    icon: Sparkles,
    label: "AI Generated",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  market_signal: {
    icon: TrendingUp,
    label: "Market Signal",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  imported: {
    icon: Upload,
    label: "Imported",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  fused: {
    icon: Layers,
    label: "Fused",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
};

export function SourceTypeBadge({ sourceType, size = "sm", showLabel = true }: SourceTypeBadgeProps) {
  const type = sourceType || "generated";
  const config = SOURCE_CONFIG[type] || SOURCE_CONFIG.generated;
  const Icon = config.icon;
  
  const sizeClasses = size === "sm" 
    ? "text-[10px] px-1.5 py-0.5 gap-1" 
    : "text-xs px-2 py-1 gap-1.5";
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses} font-medium`}
    >
      <Icon className={iconSize} />
      {showLabel && config.label}
    </Badge>
  );
}

// Filter tabs for source types
export const SOURCE_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "generated", label: "AI Generated" },
  { value: "market_signal", label: "Market Signal" },
  { value: "imported", label: "Imported" },
  { value: "fused", label: "Fused" },
] as const;

export type SourceTypeFilter = typeof SOURCE_TYPE_FILTERS[number]["value"];
