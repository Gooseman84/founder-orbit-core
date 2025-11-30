import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, TrendingDown, Minus, Hash } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface ReflectionPatternsCardProps {
  reflections: any[];
  loading?: boolean;
}

export function ReflectionPatternsCard({ reflections, loading }: ReflectionPatternsCardProps) {
  const patterns = useMemo(() => {
    if (!reflections?.length) return null;

    const energyLevels = reflections.filter(r => r.energy_level).map(r => r.energy_level);
    const stressLevels = reflections.filter(r => r.stress_level).map(r => r.stress_level);
    const allMoodTags = reflections.flatMap(r => r.mood_tags || []);
    const themes = reflections.filter(r => r.ai_theme).map(r => r.ai_theme);

    const avgEnergy = energyLevels.length 
      ? (energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length).toFixed(1)
      : null;
    const avgStress = stressLevels.length 
      ? (stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1)
      : null;

    // Calculate trend (first half vs second half)
    const midpoint = Math.floor(energyLevels.length / 2);
    const recentEnergy = energyLevels.slice(0, midpoint);
    const olderEnergy = energyLevels.slice(midpoint);
    const recentAvg = recentEnergy.length ? recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length : 0;
    const olderAvg = olderEnergy.length ? olderEnergy.reduce((a, b) => a + b, 0) / olderEnergy.length : 0;
    const energyTrend = recentAvg > olderAvg + 0.3 ? "up" : recentAvg < olderAvg - 0.3 ? "down" : "stable";

    // Top mood tags
    const moodCounts: Record<string, number> = {};
    allMoodTags.forEach(tag => {
      moodCounts[tag] = (moodCounts[tag] || 0) + 1;
    });
    const topMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mood]) => mood);

    return {
      avgEnergy,
      avgStress,
      energyTrend,
      topMoods,
      themes: themes.slice(0, 3),
      count: reflections.length,
    };
  }, [reflections]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Reflection Patterns (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!patterns) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Reflection Patterns (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No reflections recorded yet. Start your daily check-ins to see patterns!
          </p>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = patterns.energyTrend === "up" 
    ? TrendingUp 
    : patterns.energyTrend === "down" 
      ? TrendingDown 
      : Minus;

  const trendColor = patterns.energyTrend === "up" 
    ? "text-green-500" 
    : patterns.energyTrend === "down" 
      ? "text-red-500" 
      : "text-muted-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Reflection Patterns (Last 7 Days)
          <Badge variant="secondary" className="ml-auto text-xs">{patterns.count} entries</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Energy & Stress */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-accent/50">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-muted-foreground">Avg Energy</p>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            </div>
            <p className="text-2xl font-bold">
              {patterns.avgEnergy || "—"}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </p>
          </div>
          <div className="p-3 rounded-lg bg-accent/50">
            <p className="text-xs text-muted-foreground mb-1">Avg Stress</p>
            <p className="text-2xl font-bold">
              {patterns.avgStress || "—"}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </p>
          </div>
        </div>

        {/* Top Moods */}
        {patterns.topMoods.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Top Mood Tags
            </div>
            <div className="flex flex-wrap gap-1">
              {patterns.topMoods.map((mood, i) => (
                <Badge key={i} variant="outline" className="text-xs">{mood}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Themes */}
        {patterns.themes.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Recent Themes</p>
            <div className="space-y-1">
              {patterns.themes.map((theme, i) => (
                <p key={i} className="text-sm italic text-muted-foreground">"{theme}"</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
