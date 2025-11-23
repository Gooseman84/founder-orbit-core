import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeedItem } from "@/types/feed";
import { 
  Lightbulb, 
  CheckSquare, 
  Wrench, 
  TrendingUp, 
  Heart,
  Eye 
} from "lucide-react";

interface FeedCardProps {
  item: FeedItem;
  onCtaClick?: (item: FeedItem) => void;
}

const FEED_TYPE_CONFIG = {
  insight: {
    icon: Lightbulb,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    badgeVariant: "default" as const,
  },
  micro_task_suggestion: {
    icon: CheckSquare,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    badgeVariant: "default" as const,
  },
  idea_tweak: {
    icon: Wrench,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    badgeVariant: "secondary" as const,
  },
  competitor_signal: {
    icon: Eye,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    badgeVariant: "outline" as const,
  },
  motivation: {
    icon: Heart,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    badgeVariant: "secondary" as const,
  },
  market_trend: {
    icon: TrendingUp,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    badgeVariant: "default" as const,
  },
};

export function FeedCard({ item, onCtaClick }: FeedCardProps) {
  const config = FEED_TYPE_CONFIG[item.type] || FEED_TYPE_CONFIG.insight;
  const Icon = config.icon;

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h3 className="font-semibold leading-tight">{item.title}</h3>
              <Badge variant={config.badgeVariant} className="text-xs">
                {formatType(item.type)}
              </Badge>
            </div>
            {item.xpReward && (
              <Badge variant="outline" className="flex-shrink-0">
                +{item.xpReward} XP
              </Badge>
            )}
          </div>

          {/* Body */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {item.body}
          </p>

          {/* CTA */}
          {item.ctaLabel && item.ctaAction && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onCtaClick?.(item)}
              className="mt-2"
            >
              {item.ctaLabel}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
