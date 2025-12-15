import { Sparkles, ArrowDownToLine, RefreshCw, Clock, Star, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WorkspaceDocument } from '@/lib/workspaceEngine';
import type { TaskContext } from '@/types/tasks';

interface WorkspaceAssistantPanelProps {
  document: WorkspaceDocument;
  loading?: boolean;
  onRequestSuggestion: (taskContext?: TaskContext) => void;
  onApplySuggestion: (mode: 'insert' | 'replace') => void;
  taskContext?: TaskContext;
}

export function WorkspaceAssistantPanel({
  document,
  loading = false,
  onRequestSuggestion,
  onApplySuggestion,
  taskContext,
}: WorkspaceAssistantPanelProps) {
  const hasSuggestions = document.ai_suggestions && document.ai_suggestions.trim().length > 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          AI Assistant
        </CardTitle>
        <CardDescription>Get AI-powered suggestions for your content</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col">
        {/* Task context header if present */}
        {taskContext && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <div className="font-semibold text-primary uppercase tracking-wide text-xs mb-1">
              Task Focus
            </div>
            <div className="text-sm font-medium">{taskContext.title}</div>
            {taskContext.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                {taskContext.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {taskContext.estimated_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {taskContext.estimated_minutes} min
                </span>
              )}
              {taskContext.xp_reward && (
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {taskContext.xp_reward} XP
                </span>
              )}
              {taskContext.category && (
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {taskContext.category}
                </span>
              )}
            </div>
          </div>
        )}

        <Button onClick={() => onRequestSuggestion(taskContext)} disabled={loading} className="w-full">
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              {taskContext ? 'Ask AI to help with this task' : 'Ask AI to help expand this'}
            </>
          )}
        </Button>

        {hasSuggestions && (
          <>
            <div className="border-t pt-4 flex flex-col">
              <p className="text-sm font-medium mb-2">Latest Suggestion:</p>
              <div className="border rounded-md p-3 max-h-[400px] overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">
                  {document.ai_suggestions}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Button
                onClick={() => onApplySuggestion('insert')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <ArrowDownToLine className="w-4 h-4 mr-2" />
                Insert at cursor
              </Button>
              <Button
                onClick={() => onApplySuggestion('replace')}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Replace all content
              </Button>
            </div>
          </>
        )}

        {!hasSuggestions && !loading && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {taskContext
                  ? 'Click above to get AI help completing this task'
                  : 'Click the button above to generate AI suggestions'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
