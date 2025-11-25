import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface LevelBadgeProps {
  level: number;
}

export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <Badge variant="secondary" className="gap-1.5 px-3 py-1">
      <Trophy className="h-3.5 w-3.5" />
      <span className="font-semibold">Level {level}</span>
    </Badge>
  );
}
