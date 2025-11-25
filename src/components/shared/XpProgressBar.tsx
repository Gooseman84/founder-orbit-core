import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";

interface XpProgressBarProps {
  totalXp: number;
  level: number;
  nextLevelXp: number;
  currentLevelMinXp: number;
  progressPercent: number;
}

export function XpProgressBar({
  totalXp,
  level,
  nextLevelXp,
  currentLevelMinXp,
  progressPercent,
}: XpProgressBarProps) {
  const xpInCurrentLevel = totalXp - currentLevelMinXp;
  const xpNeededForNext = nextLevelXp - currentLevelMinXp;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">XP Progress</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalXp} XP • Level {level} • {Math.round(progressPercent)}% to Level {level + 1}
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{xpInCurrentLevel} XP</span>
        <span>{xpNeededForNext} XP</span>
      </div>
    </div>
  );
}
