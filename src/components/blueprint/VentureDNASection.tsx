import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { PromptViewer } from "@/components/shared/PromptViewer";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { promptTypeRequiresPro } from "@/config/plans";
import { toast } from "sonner";
import {
  Dna,
  ChevronDown,
  Info,
  Lock,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformMode, MasterPromptData } from "@/types/masterPrompt";
import { PLATFORM_MODE_LABELS } from "@/types/masterPrompt";

interface VentureDNASectionProps {
  ideaId: string;
  ventureId: string;
}

export function VentureDNASection({ ideaId, ventureId }: VentureDNASectionProps) {
  const { user } = useAuth();
  const { hasPro, hasFounder } = useFeatureAccess();
  const [isOpen, setIsOpen] = useState(true);
  const [activeMode, setActiveMode] = useState<PlatformMode>("strategy");
  const [prompts, setPrompts] = useState<Partial<Record<PlatformMode, MasterPromptData>>>({});
  const [loading, setLoading] = useState<PlatformMode | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  const isLocked = (mode: PlatformMode): boolean => {
    if (hasPro || hasFounder) return false;
    return promptTypeRequiresPro(mode);
  };

  // Fetch existing prompt for a mode
  const fetchPrompt = useCallback(
    async (mode: PlatformMode): Promise<MasterPromptData | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("master_prompts")
        .select("*")
        .eq("user_id", user.id)
        .eq("idea_id", ideaId)
        .eq("platform_mode", mode)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching prompt:", error);
        return null;
      }
      return data
        ? ({
            id: data.id,
            user_id: data.user_id,
            idea_id: data.idea_id,
            prompt_body: data.prompt_body,
            platform_target: data.platform_target,
            platform_mode: (data.platform_mode as PlatformMode) || "strategy",
            context_hash: data.context_hash,
            source_updated_at: data.source_updated_at,
            created_at: data.created_at,
          } as MasterPromptData)
        : null;
    },
    [user, ideaId]
  );

  // Generate a prompt for a mode
  const generatePrompt = useCallback(
    async (mode: PlatformMode) => {
      if (!user) return;
      setLoading(mode);
      try {
        const { data, error } = await invokeAuthedFunction<{
          id: string;
          prompt_body: string;
          platform_mode?: string;
          platform_target?: string;
          context_hash?: string;
          source_updated_at?: string;
        }>("generate-master-prompt", {
          body: { ideaId, platform_mode: mode },
        });
        if (error) throw error;
        if (!data?.prompt_body) throw new Error("No prompt generated");

        const promptData: MasterPromptData = {
          id: data.id,
          user_id: user.id,
          idea_id: ideaId,
          prompt_body: data.prompt_body,
          platform_target: data.platform_target ?? null,
          platform_mode: (data.platform_mode as PlatformMode) || mode,
          context_hash: data.context_hash ?? null,
          source_updated_at: data.source_updated_at ?? null,
          created_at: new Date().toISOString(),
        };
        setPrompts((prev) => ({ ...prev, [mode]: promptData }));
        toast.success(`${PLATFORM_MODE_LABELS[mode]} generated`);
      } catch (err) {
        console.error("Prompt generation failed:", err);
        toast.error(
          err instanceof Error ? err.message : "Failed to generate prompt"
        );
      } finally {
        setLoading(null);
      }
    },
    [user, ideaId]
  );

  // Load strategy prompt on mount
  useEffect(() => {
    if (!user || !ideaId) return;
    (async () => {
      const existing = await fetchPrompt("strategy");
      if (existing) {
        setPrompts((prev) => ({ ...prev, strategy: existing }));
      } else {
        // Auto-generate strategy prompt
        await generatePrompt("strategy");
      }
      setInitialLoading(false);
    })();
  }, [user, ideaId, fetchPrompt, generatePrompt]);

  // Handle tab change — fetch or generate on demand
  const handleTabChange = async (mode: string) => {
    const m = mode as PlatformMode;
    setActiveMode(m);

    if (isLocked(m)) return; // Will show paywall overlay
    if (prompts[m]) return; // Already loaded

    // Try to fetch existing
    const existing = await fetchPrompt(m);
    if (existing) {
      setPrompts((prev) => ({ ...prev, [m]: existing }));
    } else {
      await generatePrompt(m);
    }
  };

  // Save edited prompt
  const handleSavePrompt = async (editedPrompt: string) => {
    const current = prompts[activeMode];
    if (!current?.id) throw new Error("No prompt to save");
    const { error } = await supabase
      .from("master_prompts")
      .update({ prompt_body: editedPrompt })
      .eq("id", current.id);
    if (error) throw error;
    setPrompts((prev) => ({
      ...prev,
      [activeMode]: { ...current, prompt_body: editedPrompt },
    }));
  };

  const currentPrompt = prompts[activeMode];
  const charCount = currentPrompt?.prompt_body?.length ?? 0;

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="mb-6">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer select-none pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dna className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Venture DNA</CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Your venture's strategic identity — ready to paste into any AI tool
                    </CardDescription>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground/60 ml-1 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      This is the encoded blueprint of your venture. Use it to maintain
                      consistent context when working with Claude, ChatGPT, Cursor,
                      Lovable, or any other AI coding tool.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Tabs */}
              <Tabs value={activeMode} onValueChange={handleTabChange}>
                <TabsList className="grid grid-cols-4 w-full mb-4">
                  {(["strategy", "lovable", "cursor", "v0"] as PlatformMode[]).map(
                    (mode) => (
                      <TabsTrigger
                        key={mode}
                        value={mode}
                        className="text-xs sm:text-sm gap-1"
                      >
                        {isLocked(mode) && <Lock className="h-3 w-3" />}
                        {PLATFORM_MODE_LABELS[mode]}
                      </TabsTrigger>
                    )
                  )}
                </TabsList>

                {(["strategy", "lovable", "cursor", "v0"] as PlatformMode[]).map(
                  (mode) => (
                    <TabsContent key={mode} value={mode}>
                      {/* Locked overlay for trial users */}
                      {isLocked(mode) ? (
                        <div className="relative overflow-hidden rounded-lg border">
                          <div className="p-6 blur-sm opacity-50 select-none pointer-events-none">
                            <div className="space-y-3">
                              <div className="h-4 bg-muted rounded w-3/4" />
                              <div className="h-4 bg-muted rounded w-full" />
                              <div className="h-4 bg-muted rounded w-5/6" />
                              <div className="h-20 bg-muted rounded" />
                              <div className="h-4 bg-muted rounded w-2/3" />
                            </div>
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
                            <div className="text-center space-y-3 max-w-sm px-4">
                              <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <h3 className="text-base font-semibold">Upgrade to Pro</h3>
                              <p className="text-sm text-muted-foreground">
                                Unlock {PLATFORM_MODE_LABELS[mode]} prompts to get
                                implementation-ready specs optimized for{" "}
                                {mode === "lovable"
                                  ? "Lovable"
                                  : mode === "cursor"
                                  ? "Cursor"
                                  : "v0"}
                                .
                              </p>
                              <Button
                                size="sm"
                                onClick={() => setShowPaywall(true)}
                                className="gap-2"
                              >
                                <Sparkles className="h-4 w-4" />
                                Upgrade to Pro
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : loading === mode || (mode === "strategy" && initialLoading) ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center space-y-3">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground">
                              Generating your {PLATFORM_MODE_LABELS[mode].toLowerCase()}…
                            </p>
                          </div>
                        </div>
                      ) : currentPrompt && activeMode === mode ? (
                        <div className="space-y-3">
                          {/* Prompt viewer in dark code block */}
                          <PromptViewer
                            prompt={currentPrompt.prompt_body}
                            filename={`venture-dna-${mode}`}
                            platformMode={mode}
                            isEditable={true}
                            onSave={handleSavePrompt}
                          />

                          {/* Footer: char count + regenerate */}
                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span>{charCount.toLocaleString()} characters</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1.5"
                              onClick={() => generatePrompt(mode)}
                              disabled={loading === mode}
                            >
                              {loading === mode ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Regenerate
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-12">
                          <Button
                            variant="outline"
                            onClick={() => generatePrompt(mode)}
                            disabled={loading === mode}
                            className="gap-2"
                          >
                            {loading === mode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            Generate {PLATFORM_MODE_LABELS[mode]}
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  )
                )}
              </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <PaywallModal
        featureName="Build Prompts"
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        errorCode="PROMPT_TYPE_REQUIRES_PRO"
      />
    </TooltipProvider>
  );
}
