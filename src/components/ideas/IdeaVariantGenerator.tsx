import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProUpgradeModal } from "@/components/billing/ProUpgradeModal";
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

  const handleGenerateVariant = async (mode: VariantMode) => {
    setGeneratingMode(mode);

    try {
      const { data, error } = await supabase.functions.invoke("generate-variants", {
        body: {
          ideaId: idea.id,
          variantType: mode,
        },
      });

      if (error) {
        // Check for specific error codes in the response
        const errorData = error.context ? JSON.parse(await error.context.text?.() || "{}") : {};
        const code = errorData?.code || data?.code;
        
        console.error("Variant generation error:", { code, error, errorData });

        if (code === "UPGRADE_REQUIRED") {
          setShowPaywall(true);
          return;
        }

        if (code === "AUTH_REQUIRED") {
          toast({
            title: "Authentication Required",
            description: "Please sign in to generate variants.",
            variant: "destructive",
          });
          return;
        }

        throw new Error(errorData?.error || error.message || "Failed to generate variants");
      }

      // Check response for error codes (functions.invoke may not throw on 4xx)
      if (data?.code === "UPGRADE_REQUIRED") {
        setShowPaywall(true);
        return;
      }

      if (data?.code === "AUTH_REQUIRED") {
        toast({
          title: "Authentication Required",
          description: "Please sign in to generate variants.",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const newVariants = data?.variants || [];
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
      
      // Better error visibility in dev mode
      const errorMessage = error.message || "Failed to generate variants";
      const isDev = import.meta.env.DEV;
      
      toast({
        title: "Generation Failed",
        description: isDev ? `${errorMessage} (check console for details)` : errorMessage,
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
          business_model_type: variant.businessModel || variant.model,
          target_customer: variant.targetCustomer,
          platform: variant.platform || null,
          complexity: variant.difficulty === "easy" ? "low" : variant.difficulty === "hard" ? "high" : "medium",
          time_to_first_dollar: variant.timeToFirstDollar || variant.timeToRevenue,
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Generate Variants
          </CardTitle>
          <CardDescription>
            Explore different angles and transformations of this idea
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {VARIANT_OPTIONS.map(({ mode, label, icon: Icon, description }) => (
              <Button
                key={mode}
                variant="outline"
                className="h-auto flex-col items-start p-3 text-left"
                disabled={generatingMode !== null}
                onClick={() => handleGenerateVariant(mode)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {generatingMode === mode ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{description}</span>
              </Button>
            ))}
          </div>

          {variants.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Generated Variants ({variants.length})
              </h4>
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div
                    key={variant.id || index}
                    className="p-4 border border-border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{variant.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {variant.description || variant.oneLiner}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {variant.sourceMode?.replace("_", " ") || variant.variantType || variant.category || variant.mode}
                      </Badge>
                    </div>
                    
                    {variant.viralityPotential !== undefined && (
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>🔥 Virality: {variant.viralityPotential}</span>
                        <span>⚡ Leverage: {variant.leverageScore}</span>
                        <span>🤖 Automation: {variant.automationDensity}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={savingId === variant.id || !!variant.savedId}
                        onClick={() => handleSaveVariant(variant)}
                      >
                        {savingId === variant.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                        ) : (
                          <Library className="h-3 w-3" />
                        )}
                        {variant.savedId ? "Saved" : "Save to Library"}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => handleOpenVariant(variant)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open as Full Idea
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProUpgradeModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        reasonCode="MODE_REQUIRES_PRO"
      />
    </>
  );
};
