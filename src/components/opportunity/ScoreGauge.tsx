import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  value: number; // 0-100
  size?: number; // Diameter in pixels
  strokeWidth?: number;
  className?: string;
}

export function ScoreGauge({ 
  value, 
  size = 160, 
  strokeWidth = 12,
  className 
}: ScoreGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Smooth animation on mount and value change
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);

    return () => clearTimeout(timer);
  }, [value]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;

  // Color based on score
  const getScoreColor = () => {
    if (value >= 70) return "text-green-600";
    if (value >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = () => {
    if (value >= 70) return "Strong";
    if (value >= 40) return "Moderate";
    return "Weak";
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Background circle */}
        <svg
          className="absolute inset-0 transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted opacity-20"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(
              "transition-all duration-1000 ease-out",
              getScoreColor()
            )}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div 
            className={cn(
              "text-4xl font-bold transition-colors duration-500",
              getScoreColor()
            )}
          >
            {Math.round(animatedValue)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            out of 100
          </div>
        </div>
      </div>

      {/* Label below gauge */}
      <p className="mt-3 text-sm font-medium text-center">
        {getScoreLabel()} Opportunity
      </p>
    </div>
  );
}
