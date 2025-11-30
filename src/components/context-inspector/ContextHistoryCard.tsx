import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Lightbulb, Target, FileText, Calendar, BarChart3 } from "lucide-react";
import { ContextEvent, ContextEventType } from "@/hooks/useUserContext";
import { format } from "date-fns";

interface ContextHistoryCardProps {
  events: ContextEvent[];
  loading: boolean;
}

const eventConfig: Record<ContextEventType, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  idea_created: { label: "Idea Created", icon: Lightbulb, variant: "secondary" },
  idea_chosen: { label: "Idea Chosen", icon: Target, variant: "default" },
  idea_analysis: { label: "Analysis", icon: BarChart3, variant: "outline" },
  doc_created: { label: "Doc Created", icon: FileText, variant: "secondary" },
  doc_updated: { label: "Doc Updated", icon: FileText, variant: "outline" },
  weekly_pattern: { label: "Weekly Pattern", icon: Calendar, variant: "outline" },
};

export function ContextHistoryCard({ events, loading }: ContextHistoryCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <Skeleton className="h-6 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!events.length) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Context History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No context events yet. Start by creating ideas, analyzing them, and writing workspace documents.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Context History</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Key changes in your founder context over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[72px] top-0 bottom-0 w-px bg-border" />
          
          <div className="space-y-4">
            {events.map((event, idx) => {
              const config = eventConfig[event.type];
              const Icon = config.icon;
              
              return (
                <div key={idx} className="flex gap-4 relative">
                  {/* Date */}
                  <div className="w-16 text-xs text-muted-foreground pt-0.5 text-right shrink-0">
                    {format(new Date(event.date), "MMM d")}
                  </div>
                  
                  {/* Timeline dot */}
                  <div className="relative z-10 flex items-center justify-center w-4 h-4 rounded-full bg-background border-2 border-primary shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={config.variant} className="text-xs gap-1">
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {event.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
