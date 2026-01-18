import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invokeAuthedFunction, AuthSessionMissingError } from "@/lib/invokeAuthedFunction";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
import type { PaywallReasonCode } from "@/config/paywallCopy";
import { 
  Zap, 
  DollarSign, 
  Smile, 
  Video, 
  Bot, 
  UserCircle,
  Flame,
  Sparkles,
  ExternalLink,
  Library
} from "lucide-react";

interface IdeaVariantGeneratorProps {
  idea: any;
  userId: string;
  founderProfile: any;
  onVariantsGenerated: (variants: any[]) => void;
}

type VariantMode = "chaos" | "money_printer" | "memetic" | "creator" | "automation" | "persona";

const VARIANT_OPTIONS: { mode: VariantMode; label: string; icon: any; description: string }[] = [
  { mode: "chaos", label: "Chaos Variant", icon: Zap, description: "Wild, high-shock twist" },
  { mode: "money_printer", label: "Money Printer", icon: DollarSign, description: "Automated revenue system" },
  { mode: "memetic", label: "Memetic Variant", icon: Smile, description: "Viral, culture-first angle" },
  { mode: "creator", label: "Creator Variant", icon: Video, description: "Content empire version" },
  { mode: "automation", label: "Automation Variant", icon: Bot, description: "AI agent-powered version" },
  { mode: "persona", label: "Persona Variant", icon: UserCircle, description: "AI character/avatar spin" },
];

export const IdeaVariantGenerator = ({ 
  idea, 
  userId, 
  founderProfile,
  onVariantsGenerated 
}: IdeaVariantGeneratorProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [generatingMode, setGeneratingMode] = useState<VariantMode | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReasonCode, setPaywallReasonCode] = useState<PaywallReasonCode | undefined>();

  const handleGenerateVariant = async (mode: VariantMode) => {
    setGeneratingMode(mode);

    try {
      // Build focus_area from current idea
      const focusArea = `Based on this existing idea: "${idea.title}" - ${idea.description || ""}. 
Category: ${idea.category || idea.business_model_type || "general"}. 
Platform: ${idea.platform || "any"}.
Generate a ${mode.replace("_", " ")} variant that transforms or evolves this concept.`;

      const { data, error } = await invokeAuthedFunction<{ ideas?: any[]; code?: string }>(
        "generate-founder-ideas",
        { body: { mode, focus_area: focusArea } }
      );

      if (error) throw error;

      // Also check data for plan limit errors
      if (data?.code) {
        const reasonMap: Record<string, PaywallReasonCode> = {
          "IDEA_LIMIT_REACHED": "IDEA_LIMIT_REACHED",
          "MODE_REQUIRES_PRO": "MODE_REQUIRES_PRO",
        };
        setPaywallReasonCode(reasonMap[data.code] || "IDEA_LIMIT_REACHED");
        setShowPaywall(true);
        return;
      }

      const newVariants = data?.ideas || [];
      // Mark variants with source mode
      const markedVariants = newVariants.slice(0, 3).map((v: any) => ({
        ...v,
        sourceMode: mode,
        parentIdeaId: idea.id,
      }));
      
      setVariants((prev) => [...prev, ...markedVariants]);
      onVariantsGenerated(markedVariants);

      toast({
        title: `${mode.replace("_", " ").charAt(0).toUpperCase() + mode.replace("_", " ").slice(1)} Variants Generated!`,
        description: `${newVariants.length} variant ideas created.`,
      });
    } catch (error: any) {
      console.error("Error generating variants:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate variants.",
        variant: "destructive",
      });
    } finally {
      setGeneratingMode(null);
    }
  };

  const handleSaveVariant = async (variant: any) => {
    setSavingId(variant.id);
    
    try {
      // Insert variant into ideas table
      const { data, error } = await supabase
        .from("ideas")
        .insert({
          user_id: userId,
          title: variant.title,
          description: variant.description || variant.oneLiner,
          category: variant.category,
          business_model_type: variant.model,
          target_customer: variant.targetCustomer,
          platform: variant.platform || null,
          complexity: variant.difficulty === "easy" ? "low" : variant.difficulty === "hard" ? "high" : "medium",
          time_to_first_dollar: variant.timeToRevenue,
          mode: "variant",
          engine_version: "v6",
          shock_factor: variant.shockFactor,
          virality_potential: variant.viralityPotential,
          leverage_score: variant.leverageScore,
          automation_density: variant.automationDensity,
          autonomy_level: variant.autonomyLevel,
          culture_tailwind: variant.cultureTailwind,
          chaos_factor: variant.chaosFactor,
          status: "candidate",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Saved to Library!",
        description: `"${variant.title}" is now in your ideas library.`,
      });

      // Update variant in local state with new ID
      setVariants((prev) =>
        prev.map((v) => (v.id === variant.id ? { ...v, savedId: data.id } : v))
      );

      return data;
    } catch (error: any) {
      console.error("Error saving variant:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Could not save variant.",
        variant: "destructive",
      });
      return null;
    } finally {
      setSavingId(null);
    }
  };

  const handleOpenVariant = async (variant: any) => {
    // If already saved, navigate directly
    if (variant.savedId) {
      navigate(`/ideas/${variant.savedId}`);
      return;
    }

    // Save first, then navigate
    const saved = await handleSaveVariant(variant);
    if (saved) {
      navigate(`/ideas/${saved.id}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Generate Variants
        </CardTitle>
        <CardDescription>
          Explore different angles and transformations of this idea
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variant generation buttons - stack on mobile, 2 cols on tablet+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {VARIANT_OPTIONS.map(({ mode, label, icon: Icon, description }) => (
            <Button
              key={mode}
              variant="outline"
              className="h-auto flex-col items-start p-3 text-left w-full min-w-0"
              disabled={generatingMode !== null}
              onClick={() => handleGenerateVariant(mode)}
            >
              <div className="flex items-center gap-2 mb-1 w-full min-w-0">
                {generatingMode === mode ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                )}
                <span className="font-medium text-sm truncate">{label}</span>
              </div>
              <span className="text-xs text-muted-foreground line-clamp-2 break-words hidden sm:block">
                {description}
              </span>
            </Button>
          ))}
        </div>

        {variants.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span>Generated Variants ({variants.length})</span>
            </h4>
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant.id || index}
                  className="p-3 sm:p-4 border border-border rounded-lg bg-muted/30 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium truncate sm:whitespace-normal">{variant.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                        {variant.description || variant.oneLiner}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0 whitespace-nowrap">
                      {variant.sourceMode?.replace("_", " ") || variant.category || variant.mode}
                    </Badge>
                  </div>
                  
                  {variant.viralityPotential !== undefined && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">🔥 {variant.viralityPotential}</span>
                      <span className="whitespace-nowrap">⚡ {variant.leverageScore}</span>
                      <span className="whitespace-nowrap">🤖 {variant.automationDensity}</span>
                    </div>
                  )}

                  {/* Action buttons - stack on very small screens */}
                  <div className="flex flex-col xs:flex-row gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 min-w-0 flex-1 xs:flex-initial"
                      disabled={savingId === variant.id || !!variant.savedId}
                      onClick={() => handleSaveVariant(variant)}
                    >
                      {savingId === variant.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary shrink-0" />
                      ) : (
                        <Library className="h-3 w-3 shrink-0" />
                      )}
                      <span className="truncate">{variant.savedId ? "Saved" : "Save"}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1 min-w-0 flex-1 xs:flex-initial"
                      onClick={() => handleOpenVariant(variant)}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">Open Idea</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <ProUpgradeModal
        open={showPaywall}
        onClose={() => {
          setShowPaywall(false);
          setPaywallReasonCode(undefined);
        }}
        reasonCode={paywallReasonCode}
        context={{ feature: "idea_variants" }}
      />
    </Card>
  );
};
