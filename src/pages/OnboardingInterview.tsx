// src/pages/OnboardingInterview.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextareaWithVoice } from "@/components/ui/textarea-with-voice";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getOrCreateInterview } from "@/lib/founderProfileApi";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import type { FounderInterview, InterviewTurn } from "@/types/founderInterview";

export default function OnboardingInterview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [interview, setInterview] = useState<FounderInterview | null>(null);
  const [transcript, setTranscript] = useState<InterviewTurn[]>([]);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Founder Interview | TrueBlazer.AI";
  }, []);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);
        const session = await getOrCreateInterview(user.id);
        setInterview(session);
        setTranscript(session.transcript || []);

        if (!session.transcript || session.transcript.length === 0) {
          await askNextQuestion(undefined, session);
        }
      } catch (e) {
        console.error("OnboardingInterview: failed to load interview", e);
        setError("Failed to load interview. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const askNextQuestion = useCallback(
    async (latestUserAnswer?: string, existingInterview?: FounderInterview | null) => {
      if (!user) return;
      const activeInterview = existingInterview ?? interview;
      if (!activeInterview) return;

      setAsking(true);
      setError(null);

      let optimisticTranscript = transcript;

      if (latestUserAnswer && latestUserAnswer.trim()) {
        const userTurn: InterviewTurn = {
          role: "user",
          content: latestUserAnswer.trim(),
          timestamp: new Date().toISOString(),
        };
        optimisticTranscript = [...transcript, userTurn];
        setTranscript(optimisticTranscript);
        setAnswer("");
      }

      try {
        const { data, error } = await invokeAuthedFunction<{ transcript: InterviewTurn[]; interviewId: string }>("dynamic-founder-interview", {
          body: {
            interview_id: activeInterview.id,
            mode: "question",
            latestUserAnswer: latestUserAnswer?.trim() || undefined,
          },
        });

        if (error) {
          console.error("dynamic-founder-interview error", error);
          throw error;
        }

        if (!data) {
          throw new Error("No response from interview engine");
        }

        const nextTranscript = (data as any).transcript as InterviewTurn[];
        const interviewId = (data as any).interviewId as string;

        setInterview((prev) => (prev ? { ...prev, id: interviewId, transcript: nextTranscript } : prev));
        setTranscript(nextTranscript);
      } catch (e: any) {
        console.error("OnboardingInterview: failed to get next question", e);
        setError(e?.message || "Failed to get the next question.");
        toast({
          title: "Interview error",
          description: e?.message || "We couldn\'t continue the interview. Please try again.",
          variant: "destructive",
        });
      } finally {
        setAsking(false);
      }
    },
    [user, interview, transcript, toast],
  );

  const handleSubmit = async () => {
    if (!answer.trim() || asking || !interview) return;
    await askNextQuestion(answer, interview);
  };

  const handleFinalize = async () => {
    if (!user || !interview) return;
    setFinalizing(true);
    setError(null);

    try {
      // First, generate the structured context summary
      const { data: summaryData, error: summaryError } = await invokeAuthedFunction<any>("dynamic-founder-interview", {
        body: {
          interview_id: interview.id,
          mode: "summary",
        },
      });

      if (summaryError) {
        console.error("dynamic-founder-interview summary error", summaryError);
        throw summaryError;
      }

      if (!summaryData) {
        throw new Error("No summary returned from interview engine");
      }

      // Then, merge into the FounderProfile
      const { data: finalizeData, error: finalizeError } = await invokeAuthedFunction<any>("finalize-founder-profile", {
        body: {
          interview_id: interview.id,
        },
      });

      if (finalizeError) {
        console.error("finalize-founder-profile error", finalizeError);
        throw finalizeError;
      }

      if (!finalizeData) {
        throw new Error("No profile returned from finalize function");
      }

      toast({
        title: "Profile enriched",
        description: "Mavrik has woven your interview into your founder profile.",
      });

      navigate("/ideas");
    } catch (e: any) {
      console.error("OnboardingInterview: finalize error", e);
      setError(e?.message || "Failed to finalize your profile.");
      toast({
        title: "Could not finalize profile",
        description: e?.message || "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setFinalizing(false);
    }
  };

  const aiQuestionCount = transcript.filter((t) => t.role === "ai").length;
  const canFinalize = aiQuestionCount >= 8;

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <Card className="p-6 sm:p-8 space-y-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Founder Interview with Mavrik</h1>
          <p className="text-muted-foreground text-sm">
            We'll ask around 12–18 short questions to understand your real constraints, energy, and edge. Take your
            time—there are no perfect answers.
          </p>
          <p className="text-xs text-muted-foreground">Progress: question {Math.max(aiQuestionCount, 1)} of about 15</p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="border rounded-lg bg-background/50">
          <ScrollArea className="h-80 sm:h-96 p-4 pr-6">
            <div className="flex flex-col gap-3">
              {loading && <div className="text-sm text-muted-foreground">Loading your interview...</div>}

              {!loading && transcript.length === 0 && (
                <div className="text-sm text-muted-foreground">Mavrik is getting ready to start your interview.</div>
              )}

              {transcript.map((turn, index) => (
                <div key={index} className={turn.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                      (turn.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")
                    }
                  >
                    {turn.content}
                  </div>
                </div>
              ))}

              {asking && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-muted text-muted-foreground">
                    Thinking about the next question...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-3">
          <TextareaWithVoice
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type or speak your answer here..."
            disabled={asking || loading || finalizing}
            voiceDisabled={asking || loading || finalizing}
          />
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={!answer.trim() || asking || loading || finalizing}>
                {asking ? "Sending..." : "Send answer"}
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate("/ideas")} disabled={finalizing}>
                Skip for now
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleFinalize}
              disabled={!canFinalize || finalizing || loading || asking}
            >
              {finalizing ? "Generating profile..." : "I\'m done – generate my profile"}
            </Button>
          </div>
          {!canFinalize && (
            <p className="text-xs text-muted-foreground">
              After a handful of questions (usually 8+), you can finalize and let Mavrik weave this into your profile.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
