import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, Users, Megaphone, Award, TrendingUp, Lightbulb } from "lucide-react";

interface NetworkAdvantage {
  first_ten_customers: string;
  distribution_channel: string;
  credibility_signal: string;
  fvs_impact: string;
}

interface NetworkAdvantageCardProps {
  networkAdvantage: NetworkAdvantage;
}

export const NetworkAdvantageCard = ({ networkAdvantage }: NetworkAdvantageCardProps) => {
  const sections = [
    {
      icon: Users,
      label: "Your First 10 Customers",
      value: networkAdvantage.first_ten_customers,
    },
    {
      icon: Megaphone,
      label: "Distribution Channel",
      value: networkAdvantage.distribution_channel,
    },
    {
      icon: Award,
      label: "Network Credibility Signal",
      value: networkAdvantage.credibility_signal,
    },
    {
      icon: TrendingUp,
      label: "FVS Impact",
      value: networkAdvantage.fvs_impact,
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Network className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Network Advantage</CardTitle>
            <p className="text-xs text-muted-foreground">Your unfair distribution asset</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.map((section) => (
          <div key={section.label} className="flex gap-3">
            <section.icon className="h-4 w-4 text-primary/70 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary/80 uppercase tracking-wide mb-0.5">
                {section.label}
              </p>
              <p className="text-sm text-foreground/90 leading-relaxed">{section.value}</p>
            </div>
          </div>
        ))}

        {/* Pro tip callout */}
        <div className="mt-4 pt-3 border-t border-primary/10 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary/60 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium">Pro tip:</span> Your network is often your fastest path to first revenue. Don't skip this step.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
