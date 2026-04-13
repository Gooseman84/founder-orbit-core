// src/components/discover/DiscoverChatContainer.tsx
import { useRef, useEffect } from "react";
import { DiscoverChatMessage } from "./DiscoverChatMessage";
import { DiscoverChatInput } from "./DiscoverChatInput";
import { DiscoverTypingIndicator } from "./DiscoverTypingIndicator";
import { Button } from "@/components/ui/button";
import type { InterviewTurn } from "@/types/founderInterview";
import type { ExtractionProgress } from "@/types/interviewInsights";

const SIGNAL_LEVELS = ["none", "low", "medium", "high"] as const;

function SignalDots({ level }: { level: string }) {
  const idx = SIGNAL_LEVELS.indexOf(level as any);
  const filled = idx >= 0 ? idx : 0;
  return (
    <span className="inline-flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`w-[6px] h-[6px] rounded-full transition-colors duration-300 ${
            i < filled ? "bg-primary" : "bg-muted-foreground/20"
          }`}
        />
      ))}
    </span>
  );
}

interface DiscoverChatContainerProps {
  transcript: InterviewTurn[];
  isThinking: boolean;
  progressPercent: number;
  questionNumber: number;
  estimatedTotal: number;
  canFinalize: boolean;
  isComplete: boolean;
  extractionProgress: ExtractionProgress | null;
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
  extractionProgress,
  onSendMessage,
  onFinalize,
}: DiscoverChatContainerProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isThinking]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative z-10">
      {/* Progress Bar — 3px full width */}
      <div
        className="w-full h-[3px] shrink-0"
        style={{ background: "hsl(40 15% 93% / 0.06)" }}
      >
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Header area */}
      <div className="px-3 sm:px-6 pt-6 sm:pt-8 pb-4 max-w-[720px] mx-auto w-full">
        <div className="eyebrow mb-2">FOUNDER INTELLIGENCE INTERVIEW</div>
        <p className="text-[0.95rem] font-light text-muted-foreground">
          Mavrik will ask you 4–6 questions. Answer honestly — this intelligence powers your entire TrueBlazer experience.
        </p>

        {/* Finalize CTA row */}
        <div className="flex items-center justify-between mt-4">
          <span className="label-mono">
            {questionNumber < 0
              ? "WRAPPING UP"
              : `QUESTION ${Math.max(questionNumber, 1)} OF ~${estimatedTotal}`}
          </span>
          {canFinalize && !isComplete && (
            <button
              onClick={() => onFinalize()}
              disabled={isThinking}
              className="label-mono-gold hover:opacity-80 transition-opacity disabled:opacity-40"
            >
              DONE — GENERATE IDEAS →
            </button>
          )}
        </div>

        {/* Extraction Progress Indicators */}
        {extractionProgress && (
          <div className="flex items-center gap-4 mt-3 text-[0.7rem] tracking-[0.08em] uppercase text-muted-foreground font-medium">
            <span className="inline-flex items-center gap-1.5">
              EXPERTISE <SignalDots level={extractionProgress.expertise} />
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1.5">
              CUSTOMER PAIN <SignalDots level={extractionProgress.customerPain} />
            </span>
            <span className="text-border">|</span>
            <span className="inline-flex items-center gap-1.5">
              WORKFLOW <SignalDots level={extractionProgress.workflow} />
            </span>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="mx-3 sm:mx-6 max-w-[720px] self-center w-full border-b border-border" />

      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6">
        <div className="max-w-[720px] mx-auto w-full">
          {transcript.length === 0 && !isThinking && (
            <p className="label-mono text-center py-8">
              MAVRIK IS PREPARING YOUR INTERVIEW
            </p>
          )}

          {transcript.map((turn, index) => (
            <DiscoverChatMessage
              key={index}
              role={turn.role}
              content={turn.content}
              isLast={index === transcript.length - 1}
            />
          ))}

          {isThinking && <DiscoverTypingIndicator />}

          <div ref={scrollAnchorRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-background px-3 sm:px-6 py-4 pb-20 sm:pb-4">
        <div className="max-w-[720px] mx-auto w-full">
          {isComplete ? (
            <div className="flex flex-col items-center gap-4 py-3">
              <p className="label-mono text-center">
                INTERVIEW COMPLETE
              </p>
              <Button
                onClick={() => onFinalize()}
                disabled={isThinking}
                className="w-full bg-primary text-primary-foreground font-medium text-[0.85rem] tracking-[0.06em] uppercase py-4 h-auto hover:opacity-90"
              >
                {isThinking ? "GENERATING PROFILE..." : "GENERATE MY IDEAS"}
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
