import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";

interface BadgeData {
  id: string;
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  created_at?: string;
}

interface UserBadgeData {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: BadgeData;
}

interface BadgeCardProps {
  badge: BadgeData | UserBadgeData;
  earned?: boolean;
}

export function BadgeCard({ badge, earned = false }: BadgeCardProps) {
  // Handle both badge structures (direct badge or user_badge with nested badge)
  const badgeData = 'badge' in badge && badge.badge ? badge.badge : (badge as BadgeData);
  const earnedAt = 'earned_at' in badge ? badge.earned_at : null;
  const isEarned = earned || earnedAt !== null;

  return (
    <Card 
      className={`relative overflow-hidden transition-all hover:shadow-md ${
        isEarned 
          ? "border-primary/40 bg-gradient-to-br from-primary/5 to-secondary/5" 
          : "border-muted bg-muted/30 opacity-60"
      }`}
    >
      <CardContent className="p-4">
        {/* Badge Icon */}
        <div className="flex items-start gap-3">
          <div 
            className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center text-2xl ${
              isEarned 
                ? "bg-primary/10 ring-2 ring-primary/20" 
                : "bg-muted"
            }`}
          >
            {badgeData.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title and XP */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className={`font-semibold text-sm leading-tight ${
                isEarned ? "text-foreground" : "text-muted-foreground"
              }`}>
                {badgeData.title}
              </h3>
              <Badge 
                variant="secondary" 
                className="flex-shrink-0 gap-1 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                {badgeData.xp_reward}
              </Badge>
            </div>

            {/* Description */}
            <p className={`text-xs leading-relaxed ${
              isEarned ? "text-muted-foreground" : "text-muted-foreground/70"
            }`}>
              {badgeData.description}
            </p>

            {/* Earned Date */}
            {earnedAt && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="text-primary">✓</span>
                  Earned {format(new Date(earnedAt), "MMM d, yyyy")}
                </p>
              </div>
            )}

            {/* Locked State */}
            {!isEarned && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  🔒 Not yet earned
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Shine effect for earned badges */}
      {isEarned && (
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-xl" />
      )}
    </Card>
  );
}
