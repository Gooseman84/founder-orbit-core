// src/components/discover/DiscoverTypingIndicator.tsx
import { Compass } from "lucide-react";

export function DiscoverTypingIndicator() {
  return (
    <div className="flex gap-3 justify-start" role="status" aria-label="Mavrik is typing">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Compass className="h-4 w-4 text-primary" />
      </div>
      
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span className="sr-only">Mavrik is thinking</span>
        <div className="flex gap-1">
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <span 
            className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
