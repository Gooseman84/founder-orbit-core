// Idea optimizer bar for IdeaDetail page
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { FlaskConical, Combine, RefreshCw, Beaker, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaOptimizerBarProps {
  ideaId: string;
  onGenerateVariants?: () => void;
  onRefreshScore?: () => void;
  isGeneratingVariants?: boolean;
  isRefreshingScore?: boolean;
  hasAnalysis?: boolean;
  className?: string;
}

export function IdeaOptimizerBar({
  ideaId,
  onGenerateVariants,
  onRefreshScore,
  isGeneratingVariants = false,
  isRefreshingScore = false,
  hasAnalysis = false,
  className,
}: IdeaOptimizerBarProps) {
  const navigate = useNavigate();
  
  return (
    <div className={cn(
      "flex items-center justify-end gap-2 p-3 bg-muted/30 border rounded-lg",
      className
    )}>
      <span className="text-xs text-muted-foreground mr-auto flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        Idea Optimizer
      </span>
      
      {onGenerateVariants && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onGenerateVariants}
          disabled={isGeneratingVariants}
          className="gap-1.5 h-8 text-xs"
        >
          {isGeneratingVariants ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
              Generating...
            </>
          ) : (
            <>
              <FlaskConical className="w-3.5 h-3.5" />
              Generate Variants
            </>
          )}
        </Button>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate("/fusion-lab")}
        className="gap-1.5 h-8 text-xs"
      >
        <Combine className="w-3.5 h-3.5" />
        Fuse with Others
      </Button>
      
      {hasAnalysis && onRefreshScore && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefreshScore}
          disabled={isRefreshingScore}
          className="gap-1.5 h-8 text-xs"
        >
          {isRefreshingScore ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
              Refreshing...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Score
            </>
          )}
        </Button>
      )}
      
      <Button
        size="sm"
        variant="ghost"
        onClick={() => navigate("/fusion-lab")}
        className="gap-1.5 h-8 text-xs"
      >
        <Beaker className="w-3.5 h-3.5" />
        Fusion Lab
      </Button>
    </div>
  );
}
