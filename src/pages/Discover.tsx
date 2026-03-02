// src/pages/Discover.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { DiscoverChatContainer } from "@/components/discover/DiscoverChatContainer";
import { DiscoverResumeModal } from "@/components/discover/DiscoverResumeModal";
import { FunnelStepper } from "@/components/shared/FunnelStepper";
import type { InterviewTurn } from "@/types/founderInterview";

type InterviewState = "loading" | "resume_prompt" | "active" | "complete";

export default function Discover() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  const [interviewState, setInterviewState] = useState<InterviewState>("loading");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [existingInterview, setExistingInterview] = useState<any>(null);
  const [isThinking, setIsThinking] = useState(false);
  
  useEffect(() => {
    document.title = "Discover | TrueBlazer";
  }, []);

  // Check for existing interview on mount
  useEffect(() => {
    if (!user) return;
    
    const checkExistingInterview = async () => {
      const { data, error } = await supabase
        .from("founder_interviews")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error checking existing interview:", error);
        startFreshInterview();
        return;
      }

      if (data) {
        const updatedAt = new Date(data.updated_at);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        if (data.status === "completed") {
          if (updatedAt > sevenDaysAgo) {
            setExistingInterview(data);
            setInterviewState("resume_prompt");
          } else {
            startFreshInterview();
          }
        } else if (data.status === "in_progress") {
          setExistingInterview(data);
          setInterviewState("resume_prompt");
        } else {
          startFreshInterview();
        }
      } else {
        startFreshInterview();
      }
    };

    checkExistingInterview();
  }, [user?.id]);

  const startFreshInterview = async () => {
    setInterviewState("active");
    setTranscript([]);
    setInterviewId(null);
    await fetchNextQuestion(undefined, null, []);
  };

  const continueExistingInterview = () => {
    if (existingInterview) {
      setInterviewId(existingInterview.id);
      setTranscript(existingInterview.transcript || []);
      setInterviewState("active");
    }
  };

  const fetchNextQuestion = useCallback(
    async (
      userAnswer?: string,
      currentInterviewId?: string | null,
      currentTranscript?: InterviewTurn[]
    ) => {
      if (!user) return;

      const activeInterviewId = currentInterviewId ?? interviewId;
      const activeTranscript = currentTranscript ?? transcript;

      setIsThinking(true);

      let optimisticTranscript = activeTranscript;
      if (userAnswer?.trim()) {
        const userTurn: InterviewTurn = {
          role: "user",
          content: userAnswer.trim(),
          timestamp: new Date().toISOString(),
        };
        optimisticTranscript = [...activeTranscript, userTurn];
        setTranscript(optimisticTranscript);
      }

      try {
        const { data, error } = await invokeAuthedFunction<{
          transcript: InterviewTurn[];
          interviewId: string;
          forceComplete?: boolean;
          canFinalize?: boolean;
        }>("dynamic-founder-interview", {
          body: {
            interview_id: activeInterviewId || undefined,
            mode: "question",
            latestUserAnswer: userAnswer?.trim() || undefined,
          },
        });

        if (error) throw error;
        if (!data) throw new Error("No response from interview engine");

        if (data.forceComplete) {
          setInterviewId(data.interviewId);
          setTranscript(data.transcript || optimisticTranscript);
          setInterviewState("complete");
          await handleFinalize(data.interviewId);
          return;
        }

        const newTranscript = (data.transcript as InterviewTurn[]).filter(
          (t) => t.role !== "ai" || !t.content.trim().startsWith("{")
        );
        const newInterviewId = data.interviewId;

        setInterviewId(newInterviewId);
        setTranscript(newTranscript);

        const lastAiMessage = newTranscript
          .filter((t) => t.role === "ai")
          .pop();
        if (lastAiMessage?.content.includes("[INTERVIEW_COMPLETE]")) {
          setInterviewState("complete");
        }
      } catch (e: any) {
        console.error("Discover: failed to get next question", e);
        toast({
          title: "Interview error",
          description: e?.message || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsThinking(false);
      }
    },
    [user, interviewId, transcript, toast]
  );

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isThinking) return;
    await fetchNextQuestion(message, interviewId, transcript);
  };

  const handleFinalize = async (overrideInterviewId?: string) => {
    const finalInterviewId = overrideInterviewId || interviewId;
    if (!user || !finalInterviewId) return;
    
    setIsThinking(true);
    try {
      const { data: summaryData, error: summaryError } = await invokeAuthedFunction<{
        contextSummary: any;
      }>("dynamic-founder-interview", {
        body: { interview_id: finalInterviewId, mode: "summary" },
      });

      if (summaryError) throw summaryError;

      await invokeAuthedFunction("finalize-founder-profile", {
        body: { interview_id: finalInterviewId },
      });

      toast({
        title: "Profile complete!",
        description: "Mavrik has processed your interview.",
      });

      navigate("/discover/summary", { 
        state: { insights: summaryData?.contextSummary } 
      });
    } catch (e: any) {
      console.error("Discover: finalize error", e);
      toast({
        title: "Could not finalize",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsThinking(false);
    }
  };

  const aiQuestionCount = transcript.filter((t) => t.role === "ai").length;
  const estimatedTotal = 6;
  const displayQuestionNumber = aiQuestionCount > 6 ? -1 : aiQuestionCount;
  const progressPercent = Math.min((aiQuestionCount / estimatedTotal) * 100, 100);
  const canFinalize = aiQuestionCount >= 3;

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background relative overflow-hidden">
      {/* MAVRIK watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none"
        aria-hidden="true"
      >
        <span
          className="font-display font-black"
          style={{
            fontSize: "20rem",
            color: "hsl(40 15% 93% / 0.025)",
            lineHeight: 1,
          }}
        >
          MAVRIK
        </span>
      </div>

      {/* FunnelStepper */}
      <FunnelStepper currentStep="discover" />

      {/* Minimal Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border">
        <Link
          to="/dashboard"
          className="p-2 -ml-2 hover:bg-secondary transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold">
            <span className="text-foreground">True</span>
            <span className="text-primary">Blazer</span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      {/* Resume Modal */}
      {interviewState === "resume_prompt" && existingInterview && (
        <DiscoverResumeModal
          existingInterview={existingInterview}
          onContinue={continueExistingInterview}
          onStartFresh={startFreshInterview}
        />
      )}

      {/* Loading State */}
      {interviewState === "loading" && (
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="block w-1.5 h-1.5 bg-primary"
                  style={{
                    animation: "mavrik-dot 1.2s ease-in-out infinite",
                    animationDelay: `${i * 200}ms`,
                  }}
                />
              ))}
            </div>
            <p className="label-mono">PREPARING INTERVIEW</p>
          </div>
        </div>
      )}

      {/* Active Interview */}
      {(interviewState === "active" || interviewState === "complete") && (
        <DiscoverChatContainer
          transcript={transcript}
          isThinking={isThinking}
          progressPercent={progressPercent}
          questionNumber={displayQuestionNumber}
          estimatedTotal={estimatedTotal}
          canFinalize={canFinalize}
          isComplete={interviewState === "complete"}
          onSendMessage={handleSendMessage}
          onFinalize={handleFinalize}
        />
      )}

      {/* Keyframes for dot animation */}
      <style>{`
        @keyframes mavrik-dot {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
