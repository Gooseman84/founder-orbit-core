// src/components/ideas/PainThemesPanel.tsx
// Expandable panel showing inferred pain themes for Market Signal ideas
import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PainThemesPanelProps {
  themes: string[];
  variant?: "full" | "compact";
  defaultExpanded?: boolean;
}

export function PainThemesPanel({ 
  themes, 
  variant = "full", 
  defaultExpanded = false 
}: PainThemesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!themes || themes.length === 0) return null;

  if (variant === "compact") {
    return (
      <div className="mt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        >
          <Brain className="w-3 h-3" />
          {isExpanded ? "Hide pain themes" : `View ${themes.length} pain themes`}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </Button>
        
        {isExpanded && (
          <ul className="mt-2 space-y-1 pl-4">
            {themes.map((theme, idx) => (
              <li 
                key={idx} 
                className="text-xs text-muted-foreground list-disc list-inside"
              >
                {theme}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // Full variant for IdeaDetail page
  return (
    <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left",
          "hover:bg-muted/50 transition-colors"
        )}
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-semibold">Why These Ideas</span>
          <span className="text-xs text-muted-foreground">
            ({themes.length} pain themes identified)
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-sm text-muted-foreground mb-3">
            These ideas were generated based on pain patterns inferred from market signals:
          </p>
          <ul className="space-y-2">
            {themes.map((theme, idx) => (
              <li 
                key={idx} 
                className="flex gap-2 text-sm"
              >
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="text-muted-foreground">{theme}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
