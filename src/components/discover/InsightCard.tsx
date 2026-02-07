// src/components/discover/InsightCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InsightCardProps {
  title: string;
  icon: LucideIcon;
  confidence?: "high" | "medium" | "low";
  children: React.ReactNode;
  className?: string;
}

export function InsightCard({
  title,
  icon: Icon,
  confidence,
  children,
  className,
}: InsightCardProps) {
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

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="pt-2">{children}</CardContent>
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
