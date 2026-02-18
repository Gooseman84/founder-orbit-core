// src/pages/Discover.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
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
  const { user } = useAuth();
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
            // Completed within 7 days - offer choice
            setExistingInterview(data);
            setInterviewState("resume_prompt");
          } else {
            // Older than 7 days - start fresh
            startFreshInterview();
          }
        } else if (data.status === "in_progress") {
          // In progress - offer to continue
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

      // Optimistically add user message
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

        // Handle hard stop - interview has hit max questions
        if (data.forceComplete) {
          // Interview hit max questions — auto-generating summary
          setInterviewId(data.interviewId);
          setTranscript(data.transcript || optimisticTranscript);
          setInterviewState("complete");
          // Auto-trigger finalization
          await handleFinalize(data.interviewId);
          return;
        }

        // Filter out AI messages that are raw JSON (summary artifacts)
        const newTranscript = (data.transcript as InterviewTurn[]).filter(
          (t) => t.role !== "ai" || !t.content.trim().startsWith("{")
        );
        const newInterviewId = data.interviewId;

        setInterviewId(newInterviewId);
        setTranscript(newTranscript);

        // Check for interview completion marker
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
      // Generate summary
      const { data: summaryData, error: summaryError } = await invokeAuthedFunction<{
        contextSummary: any;
      }>("dynamic-founder-interview", {
        body: { interview_id: finalInterviewId, mode: "summary" },
      });

      if (summaryError) throw summaryError;

      // Finalize profile
      await invokeAuthedFunction("finalize-founder-profile", {
        body: { interview_id: finalInterviewId },
      });

      toast({
        title: "Profile complete!",
        description: "Mavrik has processed your interview.",
      });

      // Navigate to summary page with insights
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

  // Calculate progress
  const aiQuestionCount = transcript.filter((t) => t.role === "ai").length;
  const estimatedTotal = 6;
  const displayQuestionNumber = aiQuestionCount > 6 ? -1 : aiQuestionCount; // -1 signals "wrapping up"
  const progressPercent = Math.min((aiQuestionCount / estimatedTotal) * 100, 100);
  const canFinalize = aiQuestionCount >= 3;

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* FunnelStepper replaces sidebar during guided funnel */}
      <FunnelStepper currentStep="discover" />

      {/* Minimal Header with back link */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          to="/dashboard"
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Compass className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-lg">TrueBlazer</span>
        </div>
        <div className="w-8" /> {/* spacer for centering */}
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
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Starting your interview...</p>
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
    </div>
  );
}
