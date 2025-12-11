// Unified empty state component for all views
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Sparkles, Library, Lightbulb, CheckSquare, 
  Radio, Rss, Combine, FileText, Brain 
} from "lucide-react";

type EmptyStateType = 
  | "ideas" 
  | "library" 
  | "tasks" 
  | "feed" 
  | "radar" 
  | "fusion" 
  | "workspace" 
  | "variants"
  | "generic";

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
  className?: string;
}

const DEFAULT_CONFIG: Record<EmptyStateType, {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
}> = {
  ideas: {
    icon: Lightbulb,
    title: "No Ideas Generated Yet",
    description: "Generate AI-powered business ideas tailored to your profile and preferences.",
    actionLabel: "Generate Ideas",
  },
  library: {
    icon: Library,
    title: "Your Library is Empty",
    description: "Save generated ideas, variants, or fused concepts to build your personal library.",
    actionLabel: "Generate Ideas",
  },
  tasks: {
    icon: CheckSquare,
    title: "No Tasks Yet",
    description: "Generate micro-tasks to start making progress on your venture today.",
    actionLabel: "Generate Tasks",
  },
  feed: {
    icon: Rss,
    title: "No Feed Items",
    description: "Your personalized feed will appear here with insights, tips, and actions.",
    actionLabel: "Refresh Feed",
  },
  radar: {
    icon: Radio,
    title: "No Radar Signals",
    description: "Niche radar will surface market opportunities and trends for your idea.",
    actionLabel: "Scan Market",
  },
  fusion: {
    icon: Combine,
    title: "No Fused Ideas Yet",
    description: "Combine 2-3 ideas to create hybrid ventures with unique potential.",
    actionLabel: "Start Fusing",
  },
  workspace: {
    icon: FileText,
    title: "No Documents",
    description: "Create workspace documents to plan and execute your venture.",
    actionLabel: "Create Document",
  },
  variants: {
    icon: Brain,
    title: "No Variants Generated",
    description: "Generate creative variants of this idea to explore different angles.",
    actionLabel: "Generate Variants",
  },
  generic: {
    icon: Sparkles,
    title: "Nothing Here Yet",
    description: "This section will be populated with content as you use the app.",
  },
};

export function EmptyState({
  type = "generic",
  title,
  description,
  actionLabel,
  onAction,
  isLoading = false,
  className,
}: EmptyStateProps) {
  const config = DEFAULT_CONFIG[type];
  const Icon = config.icon;
  
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayActionLabel = actionLabel || config.actionLabel;
  
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center rounded-lg border border-dashed bg-muted/20",
      className
    )}>
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground opacity-60" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{displayTitle}</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">{displayDescription}</p>
      {displayActionLabel && onAction && (
        <Button onClick={onAction} disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              Loading...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {displayActionLabel}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
