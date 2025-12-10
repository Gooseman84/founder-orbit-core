import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  DollarSign, 
  Smile, 
  Video, 
  Bot, 
  UserCircle,
  Flame,
  Sparkles
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
  const [generatingMode, setGeneratingMode] = useState<VariantMode | null>(null);
  const [variants, setVariants] = useState<any[]>([]);

  const handleGenerateVariant = async (mode: VariantMode) => {
    setGeneratingMode(mode);

    try {
      // Build focus_area from current idea
      const focusArea = `Based on this existing idea: "${idea.title}" - ${idea.description || ""}. 
Category: ${idea.category || idea.business_model_type || "general"}. 
Platform: ${idea.platform || "any"}.
Generate a ${mode.replace("_", " ")} variant that transforms or evolves this concept.`;

      const { data, error } = await supabase.functions.invoke("generate-founder-ideas", {
        body: {
          mode,
          profile: founderProfile,
          focus_area: focusArea,
        },
      });

      if (error) throw error;

      const newVariants = data?.ideas || [];
      setVariants((prev) => [...prev, ...newVariants.slice(0, 3)]);
      onVariantsGenerated(newVariants.slice(0, 3));

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
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div
                  key={variant.id || index}
                  className="p-3 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium">{variant.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {variant.description || variant.oneLiner}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {variant.category || variant.mode}
                    </Badge>
                  </div>
                  {variant.viralityPotential !== undefined && (
                    <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                      <span>🔥 Virality: {variant.viralityPotential}</span>
                      <span>⚡ Leverage: {variant.leverageScore}</span>
                      <span>🤖 Automation: {variant.automationDensity}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
