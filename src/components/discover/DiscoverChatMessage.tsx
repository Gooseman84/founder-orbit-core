// src/components/discover/DiscoverChatMessage.tsx
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InterviewRole } from "@/types/founderInterview";

interface DiscoverChatMessageProps {
  role: InterviewRole;
  content: string;
}

export function DiscoverChatMessage({ role, content }: DiscoverChatMessageProps) {
  const isAi = role === "ai";
  
  // Clean content - remove any completion markers
  const displayContent = content.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim();

  if (role === "system") {
    return null; // Don't display system messages
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isAi ? "justify-start" : "justify-end"
      )}
      role="article"
      aria-label={isAi ? "Mavrik's message" : "Your message"}
    >
      {isAi && (
        <div 
          className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
          aria-hidden="true"
        >
          <Compass className="h-4 w-4 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isAi
            ? "bg-muted text-foreground rounded-tl-sm"
            : "bg-primary text-primary-foreground rounded-tr-sm"
        )}
      >
        {displayContent}
      </div>
    </div>
  );
}
