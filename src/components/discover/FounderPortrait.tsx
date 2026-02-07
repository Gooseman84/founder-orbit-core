// src/components/discover/FounderPortrait.tsx
import { Card } from "@/components/ui/card";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface FounderPortraitProps {
  summary: string;
  className?: string;
}

export function FounderPortrait({ summary, className }: FounderPortraitProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20",
        className
      )}
    >
      <div className="absolute top-4 left-4 opacity-20">
        <Quote className="h-12 w-12 text-primary" />
      </div>
      <div className="p-6 pt-10 sm:p-8 sm:pt-12">
        <p className="text-lg sm:text-xl leading-relaxed text-foreground/90 font-medium">
          {summary}
        </p>
      </div>
    </Card>
  );
}
