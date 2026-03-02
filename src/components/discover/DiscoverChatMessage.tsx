// src/components/discover/DiscoverChatMessage.tsx
import type { InterviewRole } from "@/types/founderInterview";

interface DiscoverChatMessageProps {
  role: InterviewRole;
  content: string;
  isLast?: boolean;
}

export function DiscoverChatMessage({ role, content, isLast }: DiscoverChatMessageProps) {
  const isAi = role === "ai";
  
  const displayContent = content.replace(/\[INTERVIEW_COMPLETE\]/g, "").trim();

  if (role === "system") {
    return null;
  }

  return (
    <div>
      {isAi ? (
        /* Mavrik question — serif italic gold */
        <div className="py-6" role="article" aria-label="Mavrik's question">
          <p className="font-display italic text-[1.2rem] text-primary leading-relaxed">
            {displayContent}
          </p>
        </div>
      ) : (
        /* Founder answer — indented, light */
        <div className="py-3 pl-6" role="article" aria-label="Your answer">
          <p className="text-[0.95rem] font-light text-foreground leading-relaxed">
            {displayContent}
          </p>
        </div>
      )}

      {/* Separator between exchange pairs */}
      {!isLast && (
        <div className="border-b border-border my-2" />
      )}
    </div>
  );
}
