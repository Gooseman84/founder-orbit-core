import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Loader2,
  ChevronDown,
  CheckCircle2,
  Clock,
  PlayCircle,
  ClipboardEdit,
  Sparkles,
  MessageSquareText,
} from "lucide-react";

interface ValidationMission {
  id: string;
  session_id: string;
  venture_id: string;
  mission_title: string;
  mission_detail: string;
  suggested_questions: string[];
  target_fvs_dimension: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

interface ValidationSession {
  id: string;
  venture_id: string;
  status: string;
  hypothesis: string;
  target_evidence_count: number;
}

interface ValidationSectionProps {
  ventureId: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pending", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "default", icon: <PlayCircle className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const DIMENSION_LABELS: Record<string, string> = {
  marketSize: "Market Size",
  unitEconomics: "Unit Economics",
  timeToRevenue: "Time to Revenue",
  competitiveDensity: "Competitive Density",
  capitalRequirements: "Capital Requirements",
  founderMarketFit: "Founder-Market Fit",
};

function MissionCard({
  mission,
  onMarkComplete,
  isCompleting,
}: {
  mission: ValidationMission;
  onMarkComplete: (id: string) => void;
  isCompleting: boolean;
}) {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const statusCfg = STATUS_CONFIG[mission.status] || STATUS_CONFIG.pending;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold leading-tight">
              {mission.mission_title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {DIMENSION_LABELS[mission.target_fvs_dimension] || mission.target_fvs_dimension}
            </p>
          </div>
          <Badge variant={statusCfg.variant} className="gap-1 text-xs shrink-0">
            {statusCfg.icon}
            {statusCfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-4 pb-4 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {mission.mission_detail}
        </p>

        {/* Suggested Questions */}
        {mission.suggested_questions?.length > 0 && (
          <Collapsible open={questionsOpen} onOpenChange={setQuestionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 px-2 -ml-2">
                <MessageSquareText className="h-3 w-3" />
                Suggested Questions
                <ChevronDown className={`h-3 w-3 transition-transform ${questionsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <ul className="space-y-1.5 pl-1">
                {mission.suggested_questions.map((q, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary font-medium mt-px">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {mission.status !== "completed" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled
                title="Coming soon"
              >
                <ClipboardEdit className="h-3 w-3 mr-1" />
                Log Evidence
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs h-7"
                onClick={() => onMarkComplete(mission.id)}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                Mark Complete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ValidationSection({ ventureId }: ValidationSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<ValidationSession | null>(null);
  const [missions, setMissions] = useState<ValidationMission[]>([]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [completingMissionId, setCompletingMissionId] = useState<string | null>(null);

  // Load existing session + missions + evidence count
  const loadExistingData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch active session for this venture
      const { data: sessionData } = await supabase
        .from("validation_sessions")
        .select("*")
        .eq("venture_id", ventureId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData as unknown as ValidationSession);

        // Fetch missions for this session
        const { data: missionData } = await supabase
          .from("validation_missions")
          .select("*")
          .eq("session_id", sessionData.id)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (missionData) {
          setMissions(missionData as unknown as ValidationMission[]);
        }
      }

      // Fetch evidence count for this venture
      const { count } = await supabase
        .from("validation_evidence")
        .select("id", { count: "exact", head: true })
        .eq("venture_id", ventureId)
        .eq("user_id", user.id);

      setEvidenceCount(count ?? 0);
    } catch (err) {
      console.error("Failed to load validation data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, ventureId]);

  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // Generate validation plan
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await invokeAuthedFunction<{
        session_id: string;
        missions: ValidationMission[];
      }>("generate-validation-plan", {
        body: { venture_id: ventureId },
      });

      if (error) throw error;
      if (!data) throw new Error("No data returned");

      // Reload to get full data
      await loadExistingData();

      toast({
        title: "Validation plan created",
        description: "3 missions generated to test your riskiest assumptions.",
      });
    } catch (err) {
      console.error("Generate validation plan failed:", err);
      toast({
        title: "Failed to generate plan",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Mark mission complete
  const handleMarkComplete = async (missionId: string) => {
    setCompletingMissionId(missionId);
    try {
      const { error } = await supabase
        .from("validation_missions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", missionId)
        .eq("user_id", user!.id);

      if (error) throw error;

      setMissions((prev) =>
        prev.map((m) =>
          m.id === missionId
            ? { ...m, status: "completed", completed_at: new Date().toISOString() }
            : m
        )
      );

      toast({ title: "Mission completed ✓" });
    } catch (err) {
      toast({
        title: "Failed to update",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingMissionId(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const targetEvidence = session?.target_evidence_count ?? 5;
  const progressPercent = Math.min(100, (evidenceCount / targetEvidence) * 100);
  const hasActiveSession = !!session && missions.length > 0;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Validate Your Assumptions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Turn assumptions into evidence. Your FVS score updates as you validate.
        </p>
      </div>

      {/* Progress indicator */}
      {hasActiveSession && (
        <Card className="border-border/60">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Evidence logged</span>
              <span className="text-xs font-medium">
                {evidenceCount} of {targetEvidence}
              </span>
            </div>
            <Progress value={progressPercent} className="h-1.5" />
          </CardContent>
        </Card>
      )}

      {/* Generate button or mission cards */}
      {!hasActiveSession ? (
        <Card className="border-dashed border-primary/20">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Generate Validation Plan</p>
                <p className="text-xs text-muted-foreground">
                  AI identifies your riskiest assumptions and creates targeted missions
                </p>
              </div>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="shrink-0"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Generating…
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onMarkComplete={handleMarkComplete}
              isCompleting={completingMissionId === mission.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
