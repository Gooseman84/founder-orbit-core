import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, ArrowUpRight, Users, Zap, Plus } from "lucide-react";

interface RadarSignal {
  id: string;
  signal_type: string;
  title: string;
  description: string;
  priority_score: number;
  recommended_action: string;
  metadata?: any;
}

interface RadarCardProps {
  signal: RadarSignal;
  onGenerateTask?: (signal: RadarSignal) => void;
}

const signalTypeConfig = {
  trend: {
    icon: TrendingUp,
    label: "Trend",
    bgClass: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  problem: {
    icon: AlertCircle,
    label: "Problem",
    bgClass: "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20",
    badgeClass: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  market_shift: {
    icon: ArrowUpRight,
    label: "Market Shift",
    bgClass: "bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  },
  consumer_behavior: {
    icon: Users,
    label: "Consumer Behavior",
    bgClass: "bg-green-500/10 hover:bg-green-500/20 border-green-500/20",
    badgeClass: "bg-green-500/10 text-green-700 dark:text-green-300",
  },
  tech_tailwind: {
    icon: Zap,
    label: "Tech Tailwind",
    bgClass: "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20",
    badgeClass: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  },
};

const getPriorityColor = (score: number) => {
  if (score >= 80) return "text-red-600 dark:text-red-400";
  if (score >= 60) return "text-orange-600 dark:text-orange-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
};

const getPriorityLabel = (score: number) => {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

export function RadarCard({ signal, onGenerateTask }: RadarCardProps) {
  const config = signalTypeConfig[signal.signal_type as keyof typeof signalTypeConfig] || signalTypeConfig.trend;
  const Icon = config.icon;

  return (
    <Card className={`transition-colors ${config.bgClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className={config.badgeClass}>
              <Icon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(signal.priority_score)}>
              {getPriorityLabel(signal.priority_score)} ({signal.priority_score})
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{signal.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed">
          {signal.description}
        </CardDescription>

        <div className="rounded-md bg-muted/50 p-3 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action:</p>
          <p className="text-sm">{signal.recommended_action}</p>
        </div>

        {onGenerateTask && (
          <Button
            onClick={() => onGenerateTask(signal)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
