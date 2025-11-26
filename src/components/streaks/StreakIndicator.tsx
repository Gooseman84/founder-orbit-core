import { Flame } from "lucide-react";
import { parseISO, subDays, format, isToday } from "date-fns";

interface StreakIndicatorProps {
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

export function StreakIndicator({
  current_streak,
  longest_streak,
  last_completed_date,
}: StreakIndicatorProps) {
  // Calculate which of the last 7 days were completed
  const getLast7DaysStatus = () => {
    if (!last_completed_date || current_streak === 0) {
      return Array(7).fill(false);
    }

    const lastDate = parseISO(last_completed_date);
    const today = new Date();
    const status = [];

    for (let i = 6; i >= 0; i--) {
      const checkDate = subDays(today, i);
      const daysDiff = Math.floor(
        (today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if this day falls within the current streak
      const isCompleted = daysDiff < current_streak && isToday(lastDate) 
        ? true 
        : daysDiff <= current_streak - 1;
      
      status.push(isCompleted);
    }

    return status;
  };

  const last7Days = getLast7DaysStatus();

  return (
    <div className="flex items-center gap-4">
      {/* Streak Icon and Count */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Flame 
            className={`h-8 w-8 ${
              current_streak > 0 
                ? "text-orange-500 fill-orange-500" 
                : "text-muted-foreground"
            }`} 
          />
          {current_streak >= 7 && (
            <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <div>
          <div className="font-bold text-lg leading-none">
            {current_streak > 0 ? (
              <>
                Day <span className="text-primary">{current_streak}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No streak</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Longest: {longest_streak} {longest_streak === 1 ? "day" : "days"}
          </div>
        </div>
      </div>

      {/* Visual representation of last 7 days */}
      <div className="flex gap-1.5 ml-auto">
        {last7Days.map((isCompleted, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-colors ${
              isCompleted
                ? "bg-primary shadow-sm"
                : "bg-muted"
            }`}
            title={format(subDays(new Date(), 6 - index), "EEE, MMM d")}
          />
        ))}
      </div>
    </div>
  );
}
