import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Calendar, Battery, Brain, Zap, Target, AlertCircle, Sparkles, ListChecks, CheckSquare } from "lucide-react";
import { format } from "date-fns";

interface DailyReflection {
  id: string;
  reflection_date: string;
  energy_level: number | null;
  stress_level: number | null;
  mood_tags: string[] | null;
  what_did: string | null;
  what_learned: string | null;
  what_felt: string | null;
  top_priority: string | null;
  blockers: string | null;
  ai_summary: string | null;
  ai_theme: string | null;
  ai_micro_actions: string[] | null;
  ai_suggested_task: { title?: string; notes?: string } | null;
  created_at: string;
}

export default function ReflectionHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReflection, setSelectedReflection] = useState<DailyReflection | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (user?.id) {
      fetchReflections();
    }
  }, [user?.id]);

  const fetchReflections = async (loadMore = false) => {
    if (!user?.id) return;

    if (!loadMore) {
      setLoading(true);
    }

    try {
      const offset = loadMore ? (page + 1) * PAGE_SIZE : 0;
      
      const { data, error } = await supabase
        .from("daily_reflections")
        .select("*")
        .eq("user_id", user.id)
        .order("reflection_date", { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      const formattedData = (data || []).map(item => ({
        ...item,
        ai_micro_actions: Array.isArray(item.ai_micro_actions) 
          ? item.ai_micro_actions as string[]
          : null,
        ai_suggested_task: item.ai_suggested_task as { title?: string; notes?: string } | null,
      }));

      if (loadMore) {
        setReflections(prev => [...prev, ...formattedData]);
        setPage(p => p + 1);
      } else {
        setReflections(formattedData);
        setPage(0);
      }

      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching reflections:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const renderReflectionCard = (reflection: DailyReflection) => (
    <Card 
      key={reflection.id} 
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => setSelectedReflection(reflection)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Date and Theme */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {formatDate(reflection.reflection_date)}
              </div>
              {reflection.ai_theme && (
                <Badge variant="secondary" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {reflection.ai_theme}
                </Badge>
              )}
            </div>

            {/* Energy & Stress */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Battery className="h-4 w-4 text-green-600" />
                <span className="text-muted-foreground">Energy:</span>
                <span className="font-medium">{reflection.energy_level ?? '-'}/5</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Zap className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Stress:</span>
                <span className="font-medium">{reflection.stress_level ?? '-'}/5</span>
              </div>
            </div>

            {/* Mood Tags */}
            {reflection.mood_tags && reflection.mood_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {reflection.mood_tags.slice(0, 4).map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {reflection.mood_tags.length > 4 && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{reflection.mood_tags.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* AI Summary Preview */}
            {reflection.ai_summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {reflection.ai_summary.length > 160 
                  ? `${reflection.ai_summary.slice(0, 160)}...` 
                  : reflection.ai_summary}
                {reflection.ai_summary.length > 160 && (
                  <span className="text-primary ml-1 font-medium">Read more…</span>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderDetailModal = () => {
    if (!selectedReflection) return null;

    return (
      <Dialog open={!!selectedReflection} onOpenChange={() => setSelectedReflection(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {formatDate(selectedReflection.reflection_date)}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Theme Badge */}
            {selectedReflection.ai_theme && (
              <Badge className="gap-1">
                <Sparkles className="h-3 w-3" />
                Theme: {selectedReflection.ai_theme}
              </Badge>
            )}

            {/* Energy, Stress, Mood */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Battery className="h-4 w-4 text-green-600" />
                  Energy Level
                </div>
                <p className="text-2xl font-bold">{selectedReflection.energy_level ?? '-'}<span className="text-sm text-muted-foreground">/5</span></p>
              </div>
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Zap className="h-4 w-4 text-orange-500" />
                  Stress Level
                </div>
                <p className="text-2xl font-bold">{selectedReflection.stress_level ?? '-'}<span className="text-sm text-muted-foreground">/5</span></p>
              </div>
            </div>

            {/* Mood Tags */}
            {selectedReflection.mood_tags && selectedReflection.mood_tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Mood</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedReflection.mood_tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reflection Answers */}
            <div className="space-y-4">
              {selectedReflection.what_did && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    What I Did
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedReflection.what_did}</p>
                </div>
              )}
              {selectedReflection.what_learned && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    What I Learned
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedReflection.what_learned}</p>
                </div>
              )}
              {selectedReflection.what_felt && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    How I Felt
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedReflection.what_felt}</p>
                </div>
              )}
              {selectedReflection.top_priority && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Top Priority
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedReflection.top_priority}</p>
                </div>
              )}
              {selectedReflection.blockers && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Blockers
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{selectedReflection.blockers}</p>
                </div>
              )}
            </div>

            {/* AI Summary */}
            {selectedReflection.ai_summary && (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Summary
                </h4>
                <p className="text-sm whitespace-pre-wrap">{selectedReflection.ai_summary}</p>
              </div>
            )}

            {/* AI Micro Actions */}
            {selectedReflection.ai_micro_actions && selectedReflection.ai_micro_actions.length > 0 && (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Micro Tweaks for Tomorrow
                </h4>
                <ul className="space-y-2">
                  {selectedReflection.ai_micro_actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Suggested Task */}
            {selectedReflection.ai_suggested_task?.title && (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Suggested Task
                </h4>
                <p className="font-medium">{selectedReflection.ai_suggested_task.title}</p>
                {selectedReflection.ai_suggested_task.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedReflection.ai_suggested_task.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/daily-reflection")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Reflection History</h1>
          <p className="text-muted-foreground mt-1">
            Review your past check-ins and track how your energy, focus, and mood are shifting over time.
          </p>
        </div>
      </div>

      {/* Reflections List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reflections.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No reflections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start your daily check-in practice to build your reflection history.
            </p>
            <Button onClick={() => navigate("/daily-reflection")}>
              Start Today's Check-In
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reflections.map(renderReflectionCard)}

          {hasMore && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => fetchReflections(true)}
            >
              Load More
            </Button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}
