import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PromptViewer } from "@/components/shared/PromptViewer";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useActiveVenture } from "@/hooks/useActiveVenture";
import { useNorthStarVenture, NORTH_STAR_VENTURE_QUERY_KEY } from "@/hooks/useNorthStarVenture";
import { useGenerateVenturePlan } from "@/hooks/useGenerateVenturePlan";
import { useVenturePlans } from "@/hooks/useVenturePlans";
import { useVentureTasks } from "@/hooks/useVentureTasks";
import { ThirtyDayPlanCard } from "@/components/venture/ThirtyDayPlanCard";
import { EmptyPlanState } from "@/components/venture/EmptyPlanState";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { promptTypeRequiresPro } from "@/config/plans";
import { toast } from "sonner";
import { Loader2, AlertCircle, Sparkles, RefreshCw, Calendar, Clock, Pencil, Map, Lock } from "lucide-react";
import { 
  PlatformMode, 
  MasterPromptData,
  PLATFORM_MODE_LABELS, 
  PLATFORM_MODE_DESCRIPTIONS 
} from "@/types/masterPrompt";
import { formatDistanceToNow } from "date-fns";

const REPAIR_SESSION_KEY = "north_star_repair_attempted";
const REPAIR_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export default function NorthStar() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasPro, hasFounder } = useFeatureAccess();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState<MasterPromptData | null>(null);
  const [chosenIdeaId, setChosenIdeaId] = useState<string | null>(null);
  const [ideaTitle, setIdeaTitle] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [platformMode, setPlatformMode] = useState<PlatformMode>('strategy');
  const [isOutdated, setIsOutdated] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const repairAttemptedRef = useRef(false);

  // Check if a prompt type is locked for this user
  const isPromptTypeLocked = (type: PlatformMode): boolean => {
    if (hasPro || hasFounder) return false;
    return promptTypeRequiresPro(type);
  };

  // North Star venture hook (for auto-heal detection)
  const { needsRepair, refresh: refreshNorthStarVenture } = useNorthStarVenture();

  // Venture hooks
  const { venture, ensureVentureForIdea } = useActiveVenture();
  const { generate: generatePlan, isPending: isGeneratingPlan } = useGenerateVenturePlan();
  const { latestPlan, refetch: refetchPlans } = useVenturePlans(venture?.id ?? null);
  const { tasksByWeek, refetch: refetchTasks } = useVentureTasks(venture?.id ?? null);

  useEffect(() => {
    document.title = "North Star Master Prompt | TrueBlazer.AI";
  }, []);

  // Auto-heal: repair data drift if detected (once per session/cooldown)
  useEffect(() => {
    const attemptRepair = async () => {
      if (!user || !needsRepair || repairAttemptedRef.current) return;

      // Check session storage for cooldown
      const lastAttempt = sessionStorage.getItem(REPAIR_SESSION_KEY);
      if (lastAttempt) {
        const elapsed = Date.now() - parseInt(lastAttempt, 10);
        if (elapsed < REPAIR_COOLDOWN_MS) {
          console.log("NorthStar: repair on cooldown, skipping");
          return;
        }
      }

      repairAttemptedRef.current = true;
      sessionStorage.setItem(REPAIR_SESSION_KEY, Date.now().toString());
      console.log("NorthStar: detected data drift, attempting repair...");

      try {
        const { data, error } = await invokeAuthedFunction("repair-north-star-sync", {});
        
        if (error) {
          console.error("NorthStar: repair failed", error);
          return;
        }

        if (data?.repaired) {
          console.log("NorthStar: repair successful", data);
          // Invalidate all related queries
          queryClient.invalidateQueries({ queryKey: [NORTH_STAR_VENTURE_QUERY_KEY] });
          queryClient.invalidateQueries({ queryKey: ["ventures"] });
          queryClient.invalidateQueries({ queryKey: ["founder-blueprint"] });
          await refreshNorthStarVenture();
          toast.success("Data synced successfully");
        }
      } catch (err) {
        console.error("NorthStar: repair error", err);
      }
    };

    attemptRepair();
  }, [user, needsRepair, queryClient, refreshNorthStarVenture]);

  // Compute a stable context hash (same algorithm as edge function)
  const computeContextHash = useCallback((timestamps: (string | null | undefined)[]): string => {
    const input = timestamps.filter(Boolean).join('|');
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }, []);

  // Check if the prompt is outdated by comparing context_hash
  const checkIfOutdated = useCallback(async (promptData: MasterPromptData) => {
    if (!user || !promptData.context_hash) {
      setIsOutdated(false);
      return;
    }

    try {
      // Get latest timestamps from various sources (same sources as edge function)
      const [profileRes, ideaRes, analysisRes, docsRes, reflectionsRes, tasksRes, blueprintRes] = await Promise.all([
        supabase.from('founder_profiles').select('updated_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('ideas').select('created_at').eq('id', promptData.idea_id).maybeSingle(),
        supabase.from('idea_analysis').select('created_at').eq('idea_id', promptData.idea_id).maybeSingle(),
        supabase.from('workspace_documents').select('updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('daily_reflections').select('reflection_date').eq('user_id', user.id).order('reflection_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('tasks').select('completed_at').eq('user_id', user.id).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('founder_blueprints').select('updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      ]);

      // Compute fresh hash using same algorithm as edge function
      const freshHash = computeContextHash([
        profileRes.data?.updated_at,
        ideaRes.data?.created_at,
        analysisRes.data?.created_at,
        docsRes.data?.updated_at,
        reflectionsRes.data?.reflection_date,
        tasksRes.data?.completed_at,
        blueprintRes.data?.updated_at,
      ]);

      // Compare hashes - if different, context has changed
      setIsOutdated(freshHash !== promptData.context_hash);
    } catch (err) {
      console.error('Error checking outdated status:', err);
      setIsOutdated(false);
    }
  }, [user, computeContextHash]);

  const fetchPromptForMode = useCallback(async (mode: PlatformMode) => {
    if (!user || !chosenIdeaId) return null;

    const { data, error } = await supabase
      .from("master_prompts")
      .select("*")
      .eq("user_id", user.id)
      .eq("idea_id", chosenIdeaId)
      .eq("platform_mode", mode)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching master prompt:", error);
      return null;
    }

    return data;
  }, [user, chosenIdeaId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError("You must be logged in");
        setLoading(false);
        return;
      }

      // Step 1: Fetch the North Star idea (status = 'north_star')
      const { data: chosenIdea, error: ideaError } = await supabase
        .from("ideas")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "north_star")
        .maybeSingle();

      if (ideaError) {
        console.error("Error fetching chosen idea:", ideaError);
        throw new Error("Failed to fetch chosen idea");
      }

      if (!chosenIdea) {
        setError("You must choose an idea as your North Star before generating your Master Prompt");
        setLoading(false);
        return;
      }

      setChosenIdeaId(chosenIdea.id);
      setIdeaTitle(chosenIdea.title);

      // Step 1.5: Check if idea has been analyzed
      const { data: analysis, error: analysisError } = await supabase
        .from("idea_analysis")
        .select("id")
        .eq("idea_id", chosenIdea.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (analysisError && analysisError.code !== 'PGRST116') {
        console.error("Error checking idea analysis:", analysisError);
      }

      if (!analysis) {
        setError("Please analyze your chosen idea before generating your Master Prompt");
        setLoading(false);
        return;
      }

      // Step 2: Check if master prompt exists for current platform mode
      const existingPrompt = await fetchPromptForMode(platformMode);

      if (existingPrompt) {
        const promptData: MasterPromptData = {
          id: existingPrompt.id,
          user_id: existingPrompt.user_id,
          idea_id: existingPrompt.idea_id,
          prompt_body: existingPrompt.prompt_body,
          platform_target: existingPrompt.platform_target,
          platform_mode: (existingPrompt.platform_mode as PlatformMode) || 'strategy',
          context_hash: existingPrompt.context_hash,
          source_updated_at: existingPrompt.source_updated_at,
          created_at: existingPrompt.created_at,
        };
        setMasterPrompt(promptData);
        checkIfOutdated(promptData);
        setLoading(false);
      } else {
        // Step 3: Generate new master prompt if none exists for this mode
        await generateMasterPrompt(user.id, chosenIdea.id, platformMode);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const generateMasterPrompt = async (userId: string, ideaId: string, mode: PlatformMode) => {
    try {
      setGenerating(true);
      setError(null);

      const { data, error: functionError } = await invokeAuthedFunction<{
        id: string;
        prompt_body: string;
        platform_target?: string;
        platform_mode?: string;
        context_hash?: string;
        source_updated_at?: string;
      }>(
        "generate-master-prompt",
        {
          body: { ideaId, platform_mode: mode },
        }
      );

      if (functionError) {
        console.error("Error generating master prompt:", functionError);
        throw new Error(functionError.message || "Failed to generate master prompt");
      }

      if (!data || !data.prompt_body) {
        throw new Error("No data returned from function");
      }

      const promptData: MasterPromptData = {
        id: data.id,
        user_id: userId,
        idea_id: ideaId,
        prompt_body: data.prompt_body,
        platform_target: data.platform_target,
        platform_mode: (data.platform_mode as PlatformMode) || mode,
        context_hash: data.context_hash,
        source_updated_at: data.source_updated_at,
        created_at: new Date().toISOString(),
      };

      setMasterPrompt(promptData);
      setIsOutdated(false);
      setIsEdited(false);
      toast.success(`${PLATFORM_MODE_LABELS[mode]} generated successfully!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate master prompt";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  // Handle platform mode change
  const handleModeChange = async (newMode: string) => {
    const mode = newMode as PlatformMode;
    
    // Check if this mode is locked for trial users
    if (isPromptTypeLocked(mode)) {
      setPlatformMode(mode); // Still switch to show the locked state
      return;
    }
    
    setPlatformMode(mode);
    
    if (!user || !chosenIdeaId) return;

    setLoading(true);
    const existingPrompt = await fetchPromptForMode(mode);

    if (existingPrompt) {
      const promptData: MasterPromptData = {
        id: existingPrompt.id,
        user_id: existingPrompt.user_id,
        idea_id: existingPrompt.idea_id,
        prompt_body: existingPrompt.prompt_body,
        platform_target: existingPrompt.platform_target,
        platform_mode: (existingPrompt.platform_mode as PlatformMode) || 'strategy',
        context_hash: existingPrompt.context_hash,
        source_updated_at: existingPrompt.source_updated_at,
        created_at: existingPrompt.created_at,
      };
      setMasterPrompt(promptData);
      checkIfOutdated(promptData);
      setLoading(false);
    } else {
      // Generate for this mode
      await generateMasterPrompt(user.id, chosenIdeaId, mode);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Ensure venture exists when we have a chosen idea
  useEffect(() => {
    if (chosenIdeaId && ideaTitle && user) {
      ensureVentureForIdea(chosenIdeaId, ideaTitle).catch(console.error);
    }
  }, [chosenIdeaId, ideaTitle, user, ensureVentureForIdea]);

  // Refetch plans and tasks when venture changes
  useEffect(() => {
    if (venture?.id) {
      refetchPlans();
      refetchTasks();
    }
  }, [venture?.id, refetchPlans, refetchTasks]);

  const handleRegenerate = async () => {
    if (!user || !chosenIdeaId) {
      toast.error("Cannot regenerate: missing user or idea information");
      return;
    }
    
    // If prompt has been edited, show confirmation dialog
    if (isEdited) {
      setShowRegenerateConfirm(true);
      return;
    }
    
    await generateMasterPrompt(user.id, chosenIdeaId, platformMode);
  };

  const handleConfirmRegenerate = async () => {
    setShowRegenerateConfirm(false);
    if (!user || !chosenIdeaId) return;
    await generateMasterPrompt(user.id, chosenIdeaId, platformMode);
  };

  // Save edited prompt to database
  const handleSavePrompt = async (editedPrompt: string) => {
    if (!masterPrompt?.id) {
      throw new Error("No prompt to save");
    }

    const { error } = await supabase
      .from('master_prompts')
      .update({ prompt_body: editedPrompt })
      .eq('id', masterPrompt.id);

    if (error) {
      console.error("Error saving prompt:", error);
      throw error;
    }

    // Update local state
    setMasterPrompt(prev => prev ? { ...prev, prompt_body: editedPrompt } : null);
    setIsEdited(true);
  };

  const handleGeneratePlan = async () => {
    if (!venture?.id) {
      toast.error("No venture found. Please try refreshing the page.");
      return;
    }

    const result = await generatePlan(venture.id);
    if (result) {
      toast.success(`30-Day Plan created! We've added ${result.tasksCreated.length} tasks.`);
      refetchPlans();
      refetchTasks();
    }
  };

  // Get usage instructions based on platform mode
  const getUsageInstructions = () => {
    if (platformMode === 'strategy') {
      return (
        <>
          <p>
            This master prompt is your personalized context for AI assistants. Copy it and paste it at the
            beginning of conversations in:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>ChatGPT:</strong> Start a new chat, paste this prompt, then ask for advice</li>
            <li><strong>Claude:</strong> Begin a conversation with this context for tailored guidance</li>
            <li><strong>Perplexity:</strong> Use for research with your business context</li>
          </ul>
        </>
      );
    }

    if (platformMode === 'lovable') {
      return (
        <>
          <p>
            This is your <strong>Lovable Build Prompt</strong> — paste it into Lovable to start building your MVP.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Step 1:</strong> Click "Copy for Lovable" above</li>
            <li><strong>Step 2:</strong> Open Lovable and start a new project</li>
            <li><strong>Step 3:</strong> Paste the prompt and let Lovable build your MVP</li>
            <li><strong>Step 4:</strong> Iterate by asking for specific features</li>
          </ul>
        </>
      );
    }

    if (platformMode === 'cursor') {
      return (
        <>
          <p>
            This is your <strong>Cursor Build Prompt</strong> — use it to guide development in Cursor IDE.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Step 1:</strong> Click "Copy for Cursor" above</li>
            <li><strong>Step 2:</strong> Open Cursor and start a new project</li>
            <li><strong>Step 3:</strong> Paste into Composer or Chat with full context</li>
            <li><strong>Step 4:</strong> Build iteratively with AI assistance</li>
          </ul>
        </>
      );
    }

    return (
      <>
        <p>
          This is your <strong>v0 UI Prompt</strong> — paste it into v0.dev to generate your UI components.
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Step 1:</strong> Click "Copy for v0" above</li>
          <li><strong>Step 2:</strong> Go to v0.dev</li>
          <li><strong>Step 3:</strong> Paste the prompt to generate your UI</li>
          <li><strong>Step 4:</strong> Export components to your project</li>
        </ul>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            {generating ? `Generating your ${PLATFORM_MODE_LABELS[platformMode]}...` : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  if (error === "Please analyze your chosen idea before generating your Master Prompt") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Your TrueBlazer Master Prompt</h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Idea Not Analyzed Yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Before generating your Master Prompt, you need to analyze your chosen idea.
            This provides the strategic insights needed to create a personalized AI guidance system.
          </p>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            Analyze My Idea
          </Button>
        </Card>
      </div>
    );
  }

  if (error === "You must choose an idea as your North Star before generating your Master Prompt") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Your TrueBlazer Master Prompt</h1>
          </div>
        </div>

        <Card className="p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">No North Star Set</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You must choose an idea as your North Star before generating your Master Prompt. The Master Prompt
            provides personalized AI guidance based on your primary business focus.
          </p>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            Choose North Star
          </Button>
        </Card>
      </div>
    );
  }

  if (error && !masterPrompt) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <Card className="p-6 text-center space-y-4">
          <h2 className="text-xl font-semibold">Unable to Generate Master Prompt</h2>
          <p className="text-muted-foreground">
            To generate your North Star master prompt, you need to:
          </p>
          <ol className="text-left max-w-md mx-auto space-y-2 list-decimal list-inside">
            <li>Complete your founder profile</li>
            <li>Generate and select a business idea</li>
            <li>Analyze your chosen idea</li>
            <li>Set it as your North Star</li>
          </ol>
          <Button onClick={() => navigate("/ideas")} className="mt-4">
            Go to Ideas
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Master Prompt
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <Sparkles className="h-7 w-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-display font-semibold tracking-tight">
            North Star for {ideaTitle}
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
          A reusable, high-context brief you can paste into any AI assistant to keep your strategy,
          constraints, and execution plan aligned.
        </p>
      </div>

      {/* Platform Mode Selector */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Prompt Type</h3>
            <p className="text-xs text-muted-foreground">{PLATFORM_MODE_DESCRIPTIONS[platformMode]}</p>
          </div>
          <Tabs value={platformMode} onValueChange={handleModeChange}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="strategy" className="text-xs sm:text-sm">
                {PLATFORM_MODE_LABELS.strategy}
              </TabsTrigger>
              <TabsTrigger value="lovable" className="text-xs sm:text-sm gap-1">
                {isPromptTypeLocked('lovable') && <Lock className="h-3 w-3" />}
                {PLATFORM_MODE_LABELS.lovable}
              </TabsTrigger>
              <TabsTrigger value="cursor" className="text-xs sm:text-sm gap-1">
                {isPromptTypeLocked('cursor') && <Lock className="h-3 w-3" />}
                {PLATFORM_MODE_LABELS.cursor}
              </TabsTrigger>
              <TabsTrigger value="v0" className="text-xs sm:text-sm gap-1">
                {isPromptTypeLocked('v0') && <Lock className="h-3 w-3" />}
                {PLATFORM_MODE_LABELS.v0}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* 30-Day Plan Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">30-Day Execution Plan</h2>
        </div>
        
        {latestPlan && venture?.id ? (
          <ThirtyDayPlanCard
            plan={latestPlan}
            tasksByWeek={tasksByWeek}
            ventureId={venture.id}
          />
        ) : (
          <EmptyPlanState
            onGenerate={handleGeneratePlan}
            isGenerating={isGeneratingPlan}
            disabled={!venture?.id}
          />
        )}
      </section>

      {/* Usage Instructions */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          How to Use Your {PLATFORM_MODE_LABELS[platformMode]}
        </h3>
        <div className="space-y-3 text-sm">
          {getUsageInstructions()}
          <p className="text-muted-foreground italic">
            💡 Tip: Save this prompt and reuse it across all your AI tools for consistent, personalized advice
            aligned with your goals and constraints.
          </p>
        </div>
      </Card>

      {/* Locked Prompt Type Overlay */}
      {isPromptTypeLocked(platformMode) && (
        <Card className="relative overflow-hidden">
          {/* Blurred placeholder content */}
          <div className="p-6 blur-sm opacity-50 select-none pointer-events-none">
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-24 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          </div>
          
          {/* Lock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
            <div className="text-center space-y-4 max-w-sm px-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">
                Upgrade to Pro
              </h3>
              <p className="text-sm text-muted-foreground">
                Access {PLATFORM_MODE_LABELS[platformMode]} build prompts to accelerate your development with AI-ready implementation specs.
              </p>
              <Button 
                onClick={() => setShowPaywallModal(true)} 
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Prompt Viewer - only show if not locked */}
      {masterPrompt && !isPromptTypeLocked(platformMode) && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {PLATFORM_MODE_LABELS[platformMode]}
                </p>
                {isEdited && (
                  <Badge variant="outline" className="text-primary border-primary/50 text-xs gap-1">
                    <Pencil className="h-3 w-3" />
                    Edited
                  </Badge>
                )}
                {isOutdated && (
                  <Badge variant="outline" className="text-destructive border-destructive/50 text-xs animate-pulse">
                    ⚠️ Context changed — regenerate?
                  </Badge>
                )}
              </div>
              <p className="text-sm md:text-base text-foreground">
                Based on your chosen idea: <span className="font-semibold">{ideaTitle}</span>
              </p>
              {masterPrompt.source_updated_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Generated {formatDistanceToNow(new Date(masterPrompt.source_updated_at), { addSuffix: true })}
                </p>
              )}
            </div>
            <div className="flex gap-2 self-start md:self-auto">
              {isOutdated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={generating}
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={generating}
                className="gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card className="p-4 md:p-5 shadow-sm border-dashed">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">
              Your {PLATFORM_MODE_LABELS[platformMode].toLowerCase()}
            </h2>
            <PromptViewer
              prompt={masterPrompt.prompt_body}
              filename={`trueblazer-${ideaTitle.toLowerCase().replace(/\s+/g, "-")}`}
              platformMode={platformMode}
              isEditable={true}
              onSave={handleSavePrompt}
            />
          </Card>
        </section>
      )}

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              You have made edits to this prompt. Regenerating will replace your edited version with a new AI-generated prompt. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Additional Actions */}
      <Card className="p-4 bg-muted/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <p className="font-medium">Ready to commit?</p>
            <p className="text-muted-foreground text-xs">
              Go to your Blueprint to set a commitment window and start execution.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/profile")}>
              Edit Profile
            </Button>
            {venture?.id && (
              <Button onClick={() => navigate(`/blueprint?ventureId=${venture.id}`)} className="gap-2">
                <Map className="h-4 w-4" />
                Go to Blueprint
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Paywall Modal for locked prompt types */}
      <PaywallModal
        featureName="Build Prompts"
        open={showPaywallModal}
        onClose={() => setShowPaywallModal(false)}
        errorCode="PROMPT_TYPE_REQUIRES_PRO"
      />
    </div>
  );
}
