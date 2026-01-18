import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { supabase } from "@/integrations/supabase/client";
import { RadarCard } from "@/components/radar/RadarCard";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import { Button } from "@/components/ui/button";
import { Loader2, Radar as RadarIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { recordXpEvent } from "@/lib/xpEngine";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";

interface RadarSignal {
  id: string;
  user_id: string;
  idea_id: string | null;
  signal_type: string;
  title: string;
  description: string;
  priority_score: number;
  recommended_action: string;
  metadata: any;
  created_at: string;
}

export default function Radar() {
  const { user } = useAuth();
  const { refresh: refreshXp } = useXP();
  const { hasPro, loading: featureLoading } = useFeatureAccess();
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewedSignals, setViewedSignals] = useState<Set<string>>(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSignals();
    }
  }, [user]);

  const fetchSignals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("niche_radar")
        .select("*")
        .eq("user_id", user.id)
        .order("priority_score", { ascending: false });

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error("Error fetching radar signals:", error);
      toast.error("Failed to load radar signals");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSignals = async () => {
    if (!user) return;

    // Check Pro access before generating
    if (!hasPro) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      setGenerating(true);
      const { data, error } = await invokeAuthedFunction<{ signals?: any[] }>("generate-niche-radar", {});

      if (error) {
        // Check if it's a subscription-related error
        if (error.message?.includes("upgrade") || error.message?.includes("Pro subscription")) {
          setShowUpgradeModal(true);
          return;
        }
        throw error;
      }

      toast.success(`Generated ${data.signals?.length || 0} new radar signals!`);
      await fetchSignals();
      refreshXp();
    } catch (error: any) {
      console.error("Error generating radar signals:", error);
      if (error.message?.includes("profile") || error.message?.includes("chosen idea")) {
        toast.error("Please complete onboarding and choose an idea first");
      } else {
        toast.error("Failed to generate radar signals");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleSignalView = async (signal: RadarSignal) => {
    if (!user || viewedSignals.has(signal.id)) return;

    try {
      // Award XP based on priority score
      const xpAmount = Math.round(signal.priority_score / 10);
      await recordXpEvent(user.id, "radar_view", xpAmount, {
        signalId: signal.id,
        signalType: signal.signal_type,
        priorityScore: signal.priority_score,
      });

      setViewedSignals((prev) => new Set(prev).add(signal.id));
      refreshXp();
      toast.success(`+${xpAmount} XP for exploring this signal!`);
    } catch (error) {
      console.error("Error recording radar view XP:", error);
    }
  };

  if (loading || featureLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Show upgrade modal for non-Pro users with no signals
  const showProGate = !hasPro && signals.length === 0;

  return (
    <div className="container max-w-6xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RadarIcon className="h-8 w-8" />
            Niche Radar
          </h1>
          <p className="text-muted-foreground mt-1">
            Market signals and emerging opportunities tailored to your idea
          </p>
        </div>
        <Button onClick={handleGenerateSignals} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Fresh Signals
            </>
          )}
        </Button>
      </div>

      {signals.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <div className="rounded-full bg-muted p-6">
            <RadarIcon className="h-12 w-12 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">No Radar Signals Yet</h2>
            <p className="text-muted-foreground max-w-md">
              Generate your first batch of market signals to discover emerging opportunities and trends
              aligned with your business idea.
            </p>
          </div>
          <Button onClick={handleGenerateSignals} disabled={generating} size="lg">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Radar Signals
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map((signal) => (
            <div
              key={signal.id}
              onClick={() => handleSignalView(signal)}
              className="cursor-pointer"
            >
              <RadarCard signal={signal} />
            </div>
          ))}
        </div>
      )}

      {/* Pro Upgrade Modal */}
      <ProUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reasonCode="RADAR_REQUIRES_PRO"
      />
    </div>
  );
}
