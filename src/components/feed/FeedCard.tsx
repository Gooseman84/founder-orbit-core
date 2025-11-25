import { formatDistanceToNow } from "date-fns";
import { Lightbulb, Wrench, Radar, CheckSquare } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeedCardProps {
  item: {
    id: string;
    type: string;
    title: string;
    body: string;
    cta_label?: string | null;
    cta_action?: string | null;
    xp_reward?: number | null;
    created_at?: string;
  };
  onClick?: (item: FeedCardProps["item"]) => void;
}

// Type-specific configurations
const TYPE_CONFIG = {
  insight: {
    label: "INSIGHT",
    icon: Lightbulb,
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  idea_tweak: {
    label: "TWEAK",
    icon: Wrench,
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    iconClass: "text-purple-600 dark:text-purple-400",
  },
  competitor_snapshot: {
    label: "COMPETITOR",
    icon: Radar,
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    iconClass: "text-yellow-600 dark:text-yellow-400",
  },
  micro_task: {
    label: "MICRO TASK",
    icon: CheckSquare,
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    iconClass: "text-green-600 dark:text-green-400",
  },
} as const;

export function FeedCard({ item, onClick }: FeedCardProps) {
  const config = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.insight;
  const Icon = config.icon;

  const handleCtaClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  const formattedTime = item.created_at
    ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true })
    : null;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${config.iconClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <Badge variant="outline" className={`${config.badgeClass} font-medium`}>
                {config.label}
              </Badge>
              <h3 className="font-semibold text-foreground leading-tight mt-2">
                {item.title}
              </h3>
            </div>
          </div>
          {item.xp_reward && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0">
              +{item.xp_reward} XP
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.body}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-3 border-t">
        {formattedTime && (
          <span className="text-xs text-muted-foreground">
            {formattedTime}
          </span>
        )}
        {item.cta_label && (
          <Button
            onClick={handleCtaClick}
            size="sm"
            variant="outline"
            className="ml-auto"
          >
            {item.cta_label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
