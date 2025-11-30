import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, AlertTriangle, Zap, Battery } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ExtendedIntakeCardProps {
  extendedIntake: any | null;
  loading?: boolean;
}

export function ExtendedIntakeCard({ extendedIntake, loading }: ExtendedIntakeCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Extended Intake
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!extendedIntake) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Extended Intake
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No extended intake data yet. Complete the extended questionnaire to see deeper insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Extended Intake
              </CardTitle>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Deep Desires */}
            {extendedIntake.deep_desires && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Deep Desires
                </div>
                <p className="text-sm text-muted-foreground">{extendedIntake.deep_desires}</p>
              </div>
            )}

            {/* Fears */}
            {extendedIntake.fears && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Fears & Concerns
                </div>
                <p className="text-sm text-muted-foreground">{extendedIntake.fears}</p>
              </div>
            )}

            {/* Energy Givers */}
            {extendedIntake.energy_givers && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Zap className="h-4 w-4 text-green-500" />
                  Energy Givers
                </div>
                <p className="text-sm text-muted-foreground">{extendedIntake.energy_givers}</p>
              </div>
            )}

            {/* Energy Drainers */}
            {extendedIntake.energy_drainers && (
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <Battery className="h-4 w-4 text-red-500" />
                  Energy Drainers
                </div>
                <p className="text-sm text-muted-foreground">{extendedIntake.energy_drainers}</p>
              </div>
            )}

            {/* Identity Statements */}
            {extendedIntake.identity_statements && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Identity Statements</p>
                <p className="text-sm">{extendedIntake.identity_statements}</p>
              </div>
            )}

            {/* Business Archetypes */}
            {extendedIntake.business_archetypes?.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Business Archetypes</p>
                <div className="flex flex-wrap gap-1">
                  {extendedIntake.business_archetypes.map((archetype: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">{archetype}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Personality Flags */}
            {extendedIntake.personality_flags && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Personality Traits</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(extendedIntake.personality_flags).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${value ? "bg-green-500" : "bg-muted"}`} />
                      <span className="capitalize">{key.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
