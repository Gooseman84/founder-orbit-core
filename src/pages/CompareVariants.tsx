import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  Briefcase, 
  Lightbulb, 
  ListChecks, 
  AlertCircle,
  Rocket,
  CheckCircle
} from "lucide-react";

interface VariantIdea {
  id: string;
  title: string;
  description: string | null;
  target_customer: string | null;
  business_model_type: string | null;
  time_to_first_dollar: string | null;
  complexity: string | null;
  source_meta: {
    variant_label?: string;
    idea_payload?: {
      problem?: string;
      why_it_fits?: string;
      first_steps?: string[];
    };
  } | null;
}

const getComplexityVariant = (complexity: string | null) => {
  switch (complexity?.toLowerCase()) {
    case "low":
      return "secondary";
    case "medium":
      return "default";
    case "high":
      return "destructive";
    default:
      return "outline";
  }
};

const CompareVariants = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [variants, setVariants] = useState<VariantIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    const fetchVariants = async () => {
      if (!user || ids.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("ideas")
          .select("id, title, description, target_customer, business_model_type, time_to_first_dollar, complexity, source_meta")
          .in("id", ids)
          .eq("user_id", user.id);

        if (error) throw error;
        
        // Sort by variant label (A, B, C)
        const sorted = (data || []).sort((a, b) => {
          const labelA = (a.source_meta as any)?.variant_label || "Z";
          const labelB = (b.source_meta as any)?.variant_label || "Z";
          return labelA.localeCompare(labelB);
        });
        
        setVariants(sorted as VariantIdea[]);
      } catch (error) {
        console.error("Error fetching variants:", error);
        toast({
          title: "Error",
          description: "Failed to load variants",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [user, ids.join(",")]);

  const handlePromote = async (variant: VariantIdea) => {
    if (!user) return;
    
    setPromotingId(variant.id);
    try {
      const ideaPayload = variant.source_meta?.idea_payload;
      
      // Build a BusinessIdea-like object for the promote function
      const ideaForPromotion = {
        id: variant.id,
        title: variant.title,
        oneLiner: variant.description || "",
        description: variant.description || "",
        problemStatement: ideaPayload?.problem || "",
        targetCustomer: variant.target_customer || "",
        revenueModel: variant.business_model_type || "",
        mvpApproach: "",
        goToMarket: "",
        competitiveAdvantage: "",
        financialTrajectory: { month3: "", month6: "", month12: "", mrrCeiling: "" },
        requiredToolsSkills: "",
        risksMitigation: "",
        whyItFitsFounder: ideaPayload?.why_it_fits || "",
        primaryPassionDomains: [],
        primarySkillNeeds: [],
        markets: [],
        businessArchetype: variant.business_model_type || "unspecified",
        hoursPerWeekMin: 5,
        hoursPerWeekMax: 20,
        capitalRequired: 0,
        riskLevel: "medium" as const,
        timeToFirstRevenueMonths: 1,
        requiresPublicPersonalBrand: false,
        requiresTeamSoon: false,
        requiresCoding: false,
        salesIntensity: 3 as const,
        asyncDepthWork: 3 as const,
        firstSteps: ideaPayload?.first_steps || [],
      };

      const { data, error } = await supabase.functions.invoke(
        "promote-idea-to-workspace",
        {
          body: { idea: ideaForPromotion, createTasks: true, userId: user.id },
        }
      );

      if (error) throw error;

      toast({
        title: "Promoted to Workspace!",
        description: `"${variant.title}" is now in your workspace with starter tasks.`,
      });

      // Navigate to the new workspace document
      if (data?.documentId) {
        navigate(`/workspace/${data.documentId}`);
      } else {
        navigate("/workspace");
      }
    } catch (error) {
      console.error("Promote error:", error);
      toast({
        title: "Error",
        description: "Failed to promote to workspace",
        variant: "destructive",
      });
    } finally {
      setPromotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading variants...</p>
        </div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">No Variants Found</h2>
        <p className="text-muted-foreground mb-6">The requested variants could not be found.</p>
        <Button onClick={() => navigate("/ideas")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/ideas")} className="-ml-2 mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Ideas
          </Button>
          <h1 className="text-3xl font-bold">Compare Variants</h1>
          <p className="text-muted-foreground mt-1">
            Review your imported idea variants side-by-side and pick the best one to pursue.
          </p>
        </div>
      </div>

      <div className={`grid gap-6 ${variants.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {variants.map((variant) => {
          const ideaPayload = variant.source_meta?.idea_payload;
          const variantLabel = variant.source_meta?.variant_label;
          
          return (
            <Card key={variant.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {variantLabel && (
                      <Badge variant="outline" className="mb-2 text-xs font-semibold">
                        Variant {variantLabel}
                      </Badge>
                    )}
                    <CardTitle className="text-xl leading-tight">{variant.title}</CardTitle>
                  </div>
                  {variant.complexity && (
                    <Badge variant={getComplexityVariant(variant.complexity)} className="text-xs flex-shrink-0">
                      {variant.complexity}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Problem */}
                {ideaPayload?.problem && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      Problem
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{ideaPayload.problem}</p>
                  </div>
                )}

                {/* Target Customer */}
                {variant.target_customer && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="w-4 h-4 text-primary" />
                      Target Customer
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{variant.target_customer}</p>
                  </div>
                )}

                {/* Why It Fits */}
                {ideaPayload?.why_it_fits && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="w-4 h-4 text-accent-foreground" />
                      Why It Fits You
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ideaPayload.why_it_fits}</p>
                  </div>
                )}

                <Separator />

                {/* Business Model + Time + Complexity */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {variant.business_model_type && (
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        Model
                      </div>
                      <p className="font-medium capitalize">{variant.business_model_type}</p>
                    </div>
                  )}
                  {variant.time_to_first_dollar && (
                    <div>
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        Time to $
                      </div>
                      <p className="font-medium">{variant.time_to_first_dollar}</p>
                    </div>
                  )}
                </div>

                {/* First Steps */}
                {ideaPayload?.first_steps && ideaPayload.first_steps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <ListChecks className="w-4 h-4 text-primary" />
                      First Steps
                    </div>
                    <ol className="space-y-1.5">
                      {ideaPayload.first_steps.slice(0, 3).map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Spacer to push CTA to bottom */}
                <div className="flex-1" />

                {/* CTA */}
                <Button 
                  onClick={() => handlePromote(variant)} 
                  disabled={promotingId === variant.id}
                  className="w-full mt-4 gap-2"
                >
                  {promotingId === variant.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Promoting...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Promote to Workspace
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CompareVariants;
