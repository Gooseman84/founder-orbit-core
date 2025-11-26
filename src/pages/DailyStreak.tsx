import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { StreakIndicator } from "@/components/streaks/StreakIndicator";
import { BadgeCard } from "@/components/streaks/BadgeCard";
import { AlertCircle, Trophy, Zap } from "lucide-react";

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

interface BadgeData {
  id: string;
  badge_code: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  created_at: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge: BadgeData;
}

export default function DailyStreak() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<UserBadge[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchStreakAndBadges();
    }
  }, [user]);

  const fetchStreakAndBadges = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Load streak data
      const { data: streakData, error: streakError } = await supabase
        .from("daily_streaks")
        .select("current_streak, longest_streak, last_completed_date")
        .eq("user_id", user.id)
        .maybeSingle();

      if (streakError) throw streakError;

      setStreak(streakData || {
        current_streak: 0,
        longest_streak: 0,
        last_completed_date: null,
      });

      // Load earned badges
      const { data: badgesData, error: badgesError } = await supabase
        .from("user_badges")
        .select(`
          id,
          user_id,
          badge_id,
          earned_at,
          badge:badges(
            id,
            badge_code,
            title,
            description,
            icon,
            xp_reward,
            created_at
          )
        `)
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (badgesError) throw badgesError;

      setEarnedBadges((badgesData || []) as UserBadge[]);
    } catch (err) {
      console.error("Error loading streak and badges:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDayComplete = async () => {
    if (!user) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-daily-streak", {
        body: { userId: user.id },
      });

      if (error) throw error;

      console.log("Streak updated:", data);

      // Show success message
      toast.success("Day marked complete!", {
        description: `Current streak: ${data.streak.current_streak} days`,
      });

      // Show new badges if earned
      if (data.badgesEarned && data.badgesEarned.length > 0) {
        data.badgesEarned.forEach((badge: any) => {
          toast.success(`Badge Earned: ${badge.badge.title}`, {
            description: `+${badge.badge.xp_reward} XP`,
            icon: badge.badge.icon,
          });
        });
      }

      // Refresh data
      await fetchStreakAndBadges();
    } catch (err) {
      console.error("Error updating streak:", err);
      toast.error("Failed to update streak", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setUpdating(false);
    }
  };

  const isCompletedToday = () => {
    if (!streak?.last_completed_date) return false;
    const today = new Date().toISOString().split("T")[0];
    return streak.last_completed_date === today;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          Daily Streak
        </h1>
        <p className="text-muted-foreground">
          Build momentum by completing tasks every day. Earn badges as you grow your streak!
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Streak Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Streak</CardTitle>
          <CardDescription>
            Keep your momentum going by completing tasks daily
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {streak && (
            <StreakIndicator
              current_streak={streak.current_streak}
              longest_streak={streak.longest_streak}
              last_completed_date={streak.last_completed_date}
            />
          )}

          <Button
            onClick={handleMarkDayComplete}
            disabled={updating || isCompletedToday()}
            className="w-full"
          >
            {updating
              ? "Updating..."
              : isCompletedToday()
              ? "✓ Today Complete"
              : "Mark Today Complete"}
          </Button>

          {isCompletedToday() && (
            <p className="text-sm text-center text-muted-foreground">
              Great job! Come back tomorrow to continue your streak.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Badges Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Your Badges</h2>
          <span className="text-sm text-muted-foreground ml-2">
            ({earnedBadges.length} earned)
          </span>
        </div>

        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {earnedBadges.map((userBadge) => (
              <BadgeCard
                key={userBadge.id}
                badge={userBadge}
                earned={true}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No badges yet</h3>
              <p className="text-sm text-muted-foreground">
                Complete tasks and build streaks to earn your first badge!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
