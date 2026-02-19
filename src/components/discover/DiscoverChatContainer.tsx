// src/components/discover/DiscoverChatContainer.tsx
import { useRef, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { DiscoverChatMessage } from "./DiscoverChatMessage";
import { DiscoverChatInput } from "./DiscoverChatInput";
import { DiscoverTypingIndicator } from "./DiscoverTypingIndicator";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import type { InterviewTurn } from "@/types/founderInterview";

interface DiscoverChatContainerProps {
  transcript: InterviewTurn[];
  isThinking: boolean;
  progressPercent: number;
  questionNumber: number;
  estimatedTotal: number;
  canFinalize: boolean;
  isComplete: boolean;
  onSendMessage: (message: string) => void;
  onFinalize: () => void;
}

export function DiscoverChatContainer({
  transcript,
  isThinking,
  progressPercent,
  questionNumber,
  estimatedTotal,
  canFinalize,
  isComplete,
  onSendMessage,
  onFinalize,
}: DiscoverChatContainerProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isThinking]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Progress Bar */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <div className="max-w-[680px] mx-auto w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              {questionNumber < 0 ? "Wrapping up..." : `Question ${Math.max(questionNumber, 1)} of ~${estimatedTotal}`}
            </span>
            {canFinalize && !isComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFinalize()}
                disabled={isThinking}
                className="text-xs h-7 text-primary hover:text-primary"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Done — Generate ideas
              </Button>
            )}
          </div>
          <Progress value={progressPercent} className="h-1" />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-[680px] mx-auto w-full space-y-4">
          {transcript.length === 0 && !isThinking && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Mavrik is preparing your personalized interview...
            </div>
          )}

          {transcript.map((turn, index) => (
            <DiscoverChatMessage
              key={index}
              role={turn.role}
              content={turn.content}
            />
          ))}

          {isThinking && <DiscoverTypingIndicator />}

          {/* Scroll anchor */}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t bg-background px-4 py-3">
        <div className="max-w-[680px] mx-auto w-full">
          {isComplete ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Interview complete! Ready to discover your ideal ventures.
              </p>
              <Button onClick={() => onFinalize()} disabled={isThinking} className="w-full sm:w-auto">
                <Sparkles className="h-4 w-4 mr-2" />
                {isThinking ? "Generating profile..." : "Generate my ideas"}
              </Button>
            </div>
          ) : (
            <DiscoverChatInput
              onSend={onSendMessage}
              disabled={isThinking}
            />
          )}
        </div>
      </div>
    </div>
  );
}
