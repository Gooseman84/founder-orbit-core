import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, AlertCircle, Gift, DollarSign, Megaphone, Shield, Pencil } from "lucide-react";
import { FounderBlueprint } from "@/types/founderBlueprint";

interface BusinessBlueprintProps {
  blueprint: FounderBlueprint;
  onEditSection: (section: string) => void;
}

export const BusinessBlueprint = ({ blueprint, onEditSection }: BusinessBlueprintProps) => {
  return (
    <div className="space-y-4">
      {/* Target Audience Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-medium">Target Audience</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("target_audience")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BlueprintField value={blueprint.target_audience} />
        </CardContent>
      </Card>

      {/* Problem & Promise Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-medium">Problem & Promise</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("problem_promise")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Problem</p>
            <BlueprintField value={blueprint.problem_statement} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Promise</p>
            <BlueprintField value={blueprint.promise_statement} />
          </div>
        </CardContent>
      </Card>

      {/* Offer Model Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">Offer Model</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("offer_model")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BlueprintField value={blueprint.offer_model} />
        </CardContent>
      </Card>

      {/* Monetization Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm font-medium">Monetization Strategy</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("monetization")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BlueprintField value={blueprint.monetization_strategy} />
        </CardContent>
      </Card>

      {/* Distribution Channels Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-pink-500" />
              <CardTitle className="text-sm font-medium">Distribution Channels</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("distribution")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BlueprintField value={blueprint.distribution_channels} />
        </CardContent>
      </Card>

      {/* Unfair Advantage Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-medium">Unfair Advantage</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onEditSection("unfair_advantage")}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BlueprintField value={blueprint.unfair_advantage} />
        </CardContent>
      </Card>
    </div>
  );
};

interface BlueprintFieldProps {
  value: string | null | undefined;
}

const BlueprintField = ({ value }: BlueprintFieldProps) => {
  if (!value) {
    return <p className="text-sm text-muted-foreground/50 italic">Not set</p>;
  }
  return <p className="text-sm">{value}</p>;
};

export default BusinessBlueprint;
