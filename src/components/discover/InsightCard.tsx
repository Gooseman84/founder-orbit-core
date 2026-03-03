// src/components/discover/InsightCard.tsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LucideIcon, Pencil, X, Check } from "lucide-react";

interface InsightCardProps {
  title: string;
  icon: LucideIcon;
  confidence?: "high" | "medium" | "low";
  children: React.ReactNode;
  className?: string;
  isEditMode?: boolean;
  cardKey?: string;
  correctionValue?: string;
  onCorrectionChange?: (key: string, value: string | null) => void;
}

export function InsightCard({
  title,
  icon: Icon,
  confidence,
  children,
  className,
  isEditMode = false,
  cardKey,
  correctionValue = "",
  onCorrectionChange,
}: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localValue, setLocalValue] = useState(correctionValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(correctionValue);
  }, [correctionValue]);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  // Reset expansion when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setIsExpanded(false);
    }
  }, [isEditMode]);

  const getConfidenceColor = (level?: "high" | "medium" | "low") => {
    switch (level) {
      case "high":
        return "bg-emerald-500";
      case "medium":
        return "bg-amber-500";
      case "low":
        return "bg-red-500";
      default:
        return "bg-muted";
    }
  };

  const handleSave = () => {
    if (cardKey && onCorrectionChange) {
      onCorrectionChange(cardKey, localValue.trim() || null);
    }
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setLocalValue(correctionValue);
    setIsExpanded(false);
  };

  const handleEditClick = () => {
    setIsExpanded(true);
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {confidence && (
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    getConfidenceColor(confidence)
                  )}
                />
                {confidence === "low" && (
                  <span className="text-xs text-muted-foreground">
                    I wasn't sure about this one
                  </span>
                )}
              </div>
            )}
            {isEditMode && !isExpanded && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={handleEditClick}
                aria-label={`Edit ${title}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {children}
        
        {/* Correction indicator when saved but collapsed */}
        {isEditMode && correctionValue && !isExpanded && (
          <div className="mt-2 text-xs text-primary flex items-center gap-1">
            <Check className="h-3 w-3" />
            <span>Correction added</span>
          </div>
        )}
        
        <Collapsible open={isExpanded}>
          <CollapsibleContent className="animate-accordion-down">
            <div className="mt-4 space-y-3 border-t pt-4">
              <Textarea
                ref={textareaRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value.slice(0, 500))}
                placeholder="What would you change or add?"
                className="min-h-[80px] resize-none text-sm"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {localValue.length}/500
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="h-7 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    className="h-7 px-2 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

interface InsightPillsProps {
  items: string[];
}

export function InsightPills({ items }: InsightPillsProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">No data available</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="text-xs font-normal bg-muted/60 hover:bg-muted"
        >
          {item}
        </Badge>
      ))}
    </div>
  );
}
